import json
import hashlib
from typing import Dict, List, Set, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import (
    Dataset, DataObject, Allocation, AgentDataObject, FakeObject,
    Leak, LeakedObject, Investigation, GuiltScore, Agent
)
from app.algorithms.guilt_model import calculate_all_guilt_probabilities
from app.services.dataset_service import compute_record_key

def investigate_leak(
    db: Session,
    allocation_id: int,
    leaked_records: List[Dict[str, Any]],
    title: str = "Discovered Data Leak",
    source_description: Optional[str] = "Unauthorized repository / paste bin",
    guessing_probability_p: float = 0.2
) -> Investigation:
    allocation = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not allocation:
        raise ValueError("Allocation not found")
        
    dataset_id = allocation.dataset_id
    
    # 1. Create Leak record
    leak = Leak(
        dataset_id=dataset_id,
        title=title,
        source_description=source_description,
        total_leaked_records=len(leaked_records)
    )
    db.add(leak)
    db.flush()
    
    # 2. Fetch master DataObjects and FakeObjects for this allocation
    all_data_objects = db.query(DataObject).filter(DataObject.dataset_id == dataset_id).all()
    master_key_map = {obj.object_key: obj for obj in all_data_objects}
    
    # Map payload hash/keys to object keys
    payload_to_real_key = {}
    for obj in all_data_objects:
        k = compute_record_key(obj.data_payload)
        payload_to_real_key[k] = obj.object_key
        payload_to_real_key[obj.object_key] = obj.object_key
        
    fake_objects = db.query(FakeObject).filter(FakeObject.allocation_id == allocation_id).all()
    fake_key_map = {fo.object_key: fo for fo in fake_objects}
    
    payload_to_fake_key = {}
    for fo in fake_objects:
        fk = compute_record_key(fo.fake_payload)
        payload_to_fake_key[fk] = fo.object_key
        payload_to_fake_key[fo.object_key] = fo.object_key
        
    # Build agent allocation maps: agent_id -> set of object keys (real + fake)
    agent_objs = db.query(AgentDataObject).filter(AgentDataObject.allocation_id == allocation_id).all()
    agent_allocations: Dict[int, Set[str]] = {}
    
    for ao in agent_objs:
        if ao.agent_id not in agent_allocations:
            agent_allocations[ao.agent_id] = set()
        agent_allocations[ao.agent_id].add(ao.data_object.object_key)
        
    for fo in fake_objects:
        if fo.agent_id not in agent_allocations:
            agent_allocations[fo.agent_id] = set()
        agent_allocations[fo.agent_id].add(fo.object_key)
        
    # 3. Match leaked records against database objects
    leaked_object_rows = []
    matched_leaked_keys: Set[str] = set()
    fake_records_found_count = 0
    matched_records_count = 0
    unmatched_records_count = 0
    
    for rec in leaked_records:
        rec_key = rec.get("object_key") or compute_record_key(rec)
        is_fake = False
        matched_real_id = None
        matched_fake_id = None
        matched_key = None
        
        # Check if record is a fake object
        if rec_key in fake_key_map or rec_key in payload_to_fake_key:
            is_fake = True
            matched_key = payload_to_fake_key.get(rec_key, rec_key)
            fo = fake_key_map.get(matched_key)
            if fo:
                matched_fake_id = fo.id
            fake_records_found_count += 1
            matched_records_count += 1
            matched_leaked_keys.add(matched_key)
        elif rec_key in master_key_map or rec_key in payload_to_real_key:
            matched_key = payload_to_real_key.get(rec_key, rec_key)
            do = master_key_map.get(matched_key)
            if do:
                matched_real_id = do.id
            matched_records_count += 1
            matched_leaked_keys.add(matched_key)
        else:
            unmatched_records_count += 1
            matched_key = rec_key
            
        leaked_obj = LeakedObject(
            leak_id=leak.id,
            object_key=matched_key,
            payload=rec,
            is_fake=is_fake,
            matched_data_object_id=matched_real_id,
            matched_fake_object_id=matched_fake_id
        )
        leaked_object_rows.append(leaked_obj)
        
    db.add_all(leaked_object_rows)
    db.flush()
    
    # 4. Calculate guilt probabilities for all agents using research model
    fake_keys_set = {fo.object_key for fo in fake_objects}
    guilt_results = calculate_all_guilt_probabilities(
        leaked_objects=matched_leaked_keys,
        agent_allocations=agent_allocations,
        p=guessing_probability_p,
        fake_object_keys=fake_keys_set
    )
    
    # 5. Save Investigation & GuiltScores
    most_suspicious_agent_id = None
    max_guilt = -1.0
    guilt_score_rows = []
    
    for a_id, res in guilt_results.items():
        g_prob = res["guilt_probability"]
        if g_prob > max_guilt and g_prob > 0:
            max_guilt = g_prob
            most_suspicious_agent_id = a_id
            
        guilt_score_rows.append(GuiltScore(
            agent_id=a_id,
            guilt_probability=round(g_prob, 4),
            matched_object_count=res["matched_count"],
            fake_object_count=res["fake_count"]
        ))
        
        # Update agent suspicion score in database
        agent = db.query(Agent).filter(Agent.id == a_id).first()
        if agent:
            agent.suspicion_score = max(agent.suspicion_score, round(g_prob, 4))
            
    summary_report = {
        "disclaimer": "This is a probabilistic attribution result based on the paper's model and does not constitute definitive proof of wrongdoing.",
        "dataset_id": dataset_id,
        "allocation_id": allocation_id,
        "algorithm": allocation.algorithm,
        "total_leaked_records": len(leaked_records),
        "matched_records_count": matched_records_count,
        "unmatched_records_count": unmatched_records_count,
        "fake_records_found_count": fake_records_found_count,
        "guessing_probability_p": guessing_probability_p,
        "most_suspicious_agent_id": most_suspicious_agent_id,
        "max_guilt_probability": round(max_guilt if max_guilt >= 0 else 0.0, 4)
    }
    
    investigation = Investigation(
        leak_id=leak.id,
        allocation_id=allocation_id,
        guessing_probability_p=guessing_probability_p,
        matched_records_count=matched_records_count,
        unmatched_records_count=unmatched_records_count,
        fake_records_found_count=fake_records_found_count,
        most_suspicious_agent_id=most_suspicious_agent_id,
        summary_report=summary_report
    )
    db.add(investigation)
    db.flush()
    
    for gs in guilt_score_rows:
        gs.investigation_id = investigation.id
    db.add_all(guilt_score_rows)
    
    db.commit()
    db.refresh(investigation)
    return investigation
