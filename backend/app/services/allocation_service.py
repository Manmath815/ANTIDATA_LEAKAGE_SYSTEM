from typing import Dict, List, Set, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import Dataset, DataObject, Agent, AgentRequest, Allocation, AgentDataObject, FakeObject
from app.algorithms.allocation import (
    allocate_e_random,
    allocate_e_optimal,
    allocate_s_random,
    allocate_s_overlap,
    allocate_s_sum,
    allocate_s_max,
    compute_relative_overlap_matrix
)
from app.algorithms.guilt_model import calculate_delta_metrics
from app.algorithms.fake_records import generate_fake_object_payload

def evaluate_explicit_condition(payload: Dict[str, Any], conditions: Dict[str, Any]) -> bool:
    """Evaluates if data_payload satisfies exact condition dict (e.g. {'state': 'CA'})"""
    if not conditions:
        return True
    for key, val in conditions.items():
        if payload.get(key) != val:
            return False
    return True

def run_dataset_allocation(
    db: Session,
    dataset_id: int,
    algorithm: str, # e-random, e-optimal, s-random, s-overlap, s-sum, s-max
    allow_fake_objects: bool = True,
    fake_objects_budget: int = 10
) -> Allocation:
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise ValueError("Dataset not found")
        
    requests = db.query(AgentRequest).filter(AgentRequest.dataset_id == dataset_id).all()
    if not requests:
        raise ValueError("No agent requests configured for this dataset")
        
    data_objects = db.query(DataObject).filter(DataObject.dataset_id == dataset_id).all()
    master_object_map = {obj.object_key: obj for obj in data_objects}
    master_keys = list(master_object_map.keys())
    
    # Map requests
    request_type = requests[0].request_type # EXPLICIT or SAMPLE
    agent_fake_budgets = {req.agent_id: (req.max_fake_objects if allow_fake_objects else 0) for req in requests}
    
    # Generator for fake objects
    def fake_generator(agent_id: int, current_allocations: Set[str], current_fakes: List[Dict[str, Any]]):
        req = next((r for r in requests if r.agent_id == agent_id), None)
        conds = req.conditions if req else {}
        key, payload = generate_fake_object_payload(dataset.schema_info, conds)
        return {"object_key": key, "fake_payload": payload}

    final_allocations: Dict[int, Set[str]] = {}
    fake_objects_created: Dict[int, List[Dict[str, Any]]] = {req.agent_id: [] for req in requests}

    if algorithm.startswith("e-"):
        # Explicit requests
        explicit_sets = {}
        for req in requests:
            conds = req.conditions or {}
            matching_keys = {
                obj.object_key for obj in data_objects 
                if evaluate_explicit_condition(obj.data_payload, conds)
            }
            # Fallback if condition matched nothing: give all records or subset
            if not matching_keys and not conds:
                matching_keys = set(master_keys)
            explicit_sets[req.agent_id] = matching_keys
            
        if algorithm == "e-random":
            final_allocations, fake_objects_created = allocate_e_random(
                explicit_sets, agent_fake_budgets, fake_objects_budget, fake_generator
            )
        elif algorithm == "e-optimal":
            final_allocations, fake_objects_created = allocate_e_optimal(
                explicit_sets, agent_fake_budgets, fake_objects_budget, fake_generator
            )
        else:
            final_allocations = explicit_sets
            
    elif algorithm.startswith("s-"):
        # Sample requests
        sample_requests = {
            req.agent_id: min(req.sample_size or 10, len(master_keys))
            for req in requests
        }
        
        if algorithm == "s-random":
            final_allocations = allocate_s_random(master_keys, sample_requests)
        elif algorithm == "s-overlap":
            final_allocations = allocate_s_overlap(master_keys, sample_requests)
        elif algorithm == "s-sum":
            final_allocations = allocate_s_sum(master_keys, sample_requests)
        elif algorithm == "s-max":
            final_allocations = allocate_s_max(master_keys, sample_requests)
        else:
            final_allocations = allocate_s_random(master_keys, sample_requests)
            
        # Add fake objects if allowed for sample requests
        if allow_fake_objects and fake_objects_budget > 0:
            for req in requests:
                b_i = min(req.max_fake_objects, fake_objects_budget)
                for _ in range(b_i):
                    fake_obj = fake_generator(req.agent_id, final_allocations[req.agent_id], fake_objects_created[req.agent_id])
                    final_allocations[req.agent_id].add(fake_obj["object_key"])
                    fake_objects_created[req.agent_id].append(fake_obj)
                    
    # Calculate performance metrics Delta_bar and min_delta
    deltas = calculate_delta_metrics(final_allocations, p=0.2)
    
    # Save Allocation record
    allocation = Allocation(
        dataset_id=dataset_id,
        algorithm=algorithm,
        fake_objects_budget=fake_objects_budget if allow_fake_objects else 0,
        allow_fake_objects=allow_fake_objects,
        metrics=deltas,
        status="COMPLETED"
    )
    db.add(allocation)
    db.flush()
    
    # Create AgentDataObject and FakeObject records
    agent_objs = []
    fake_objs = []
    
    for a_id, keys in final_allocations.items():
        # Store fake objects
        for f_dict in fake_objects_created.get(a_id, []):
            f_obj = FakeObject(
                allocation_id=allocation.id,
                agent_id=a_id,
                object_key=f_dict["object_key"],
                fake_payload=f_dict["fake_payload"]
            )
            fake_objs.append(f_obj)
            
        # Store real data objects
        for key in keys:
            if key in master_object_map:
                data_obj = master_object_map[key]
                agent_objs.append(AgentDataObject(
                    allocation_id=allocation.id,
                    agent_id=a_id,
                    data_object_id=data_obj.id
                ))
                
    db.add_all(fake_objs)
    db.add_all(agent_objs)
    db.commit()
    db.refresh(allocation)
    return allocation

def get_allocation_overlap_matrix(db: Session, allocation_id: int) -> Dict[str, Any]:
    allocation = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not allocation:
        raise ValueError("Allocation not found")
        
    agent_objs = db.query(AgentDataObject).filter(AgentDataObject.allocation_id == allocation_id).all()
    fake_objs = db.query(FakeObject).filter(FakeObject.allocation_id == allocation_id).all()
    
    agent_allocations: Dict[int, Set[str]] = {}
    for ao in agent_objs:
        if ao.agent_id not in agent_allocations:
            agent_allocations[ao.agent_id] = set()
        agent_allocations[ao.agent_id].add(ao.data_object.object_key)
        
    for fo in fake_objs:
        if fo.agent_id not in agent_allocations:
            agent_allocations[fo.agent_id] = set()
        agent_allocations[fo.agent_id].add(fo.object_key)
        
    # Get agent names
    agents = db.query(Agent).filter(Agent.id.in_(agent_allocations.keys())).all()
    agent_name_map = {a.id: a.name for a in agents}
    
    agent_ids, abs_matrix, rel_matrix = compute_relative_overlap_matrix(agent_allocations)
    agent_names = [agent_name_map.get(a_id, f"Agent {a_id}") for a_id in agent_ids]
    
    deltas = calculate_delta_metrics(agent_allocations, p=0.2)
    
    return {
        "agent_ids": agent_ids,
        "agents": agent_names,
        "matrix": abs_matrix,
        "relative_overlap_matrix": rel_matrix,
        "average_delta": deltas["average_delta"],
        "min_delta": deltas["min_delta"]
    }
