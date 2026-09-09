from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.database.session import get_db
from app.models.models import Dataset, Agent, Allocation, Investigation, GuiltScore, Leak
from app.schemas.schemas import DashboardAnalyticsOut

router = APIRouter(prefix="/analytics", tags=["Analytics & Dashboard"])

@router.get("/dashboard", response_model=DashboardAnalyticsOut)
def get_dashboard_analytics(db: Session = Depends(get_db)):
    total_datasets = db.query(Dataset).count()
    total_agents = db.query(Agent).count()
    total_allocations = db.query(Allocation).count()
    active_investigations = db.query(Investigation).count()
    detected_leaks = db.query(Leak).count()
    
    agents = db.query(Agent).all()
    agent_risk_comp = []
    highest_risk_agent = None
    max_score = 0.0
    
    total_score_sum = 0.0
    scored_agents_count = 0
    
    for a in agents:
        score = a.suspicion_score or 0.0
        if score > max_score:
            max_score = score
            highest_risk_agent = a.name
        if score > 0:
            total_score_sum += score
            scored_agents_count += 1
            
        agent_risk_comp.append({
            "agent_id": a.id,
            "agent_name": a.name,
            "suspicion_score": round(score, 4),
            "is_active": a.is_active
        })
        
    avg_guilt_prob = round(total_score_sum / float(scored_agents_count), 4) if scored_agents_count > 0 else 0.0
    
    # Leakage history
    investigations = db.query(Investigation).order_by(Investigation.created_at.asc()).limit(10).all()
    leakage_hist = [
        {
            "id": inv.id,
            "date": inv.created_at.strftime("%Y-%m-%d"),
            "matched_records": inv.matched_records_count,
            "unmatched_records": inv.unmatched_records_count,
            "fake_records": inv.fake_records_found_count
        }
        for inv in investigations
    ]
    
    # Dataset distribution
    datasets = db.query(Dataset).all()
    ds_dist = [
        {
            "name": ds.name[:18] + ("..." if len(ds.name) > 18 else ""),
            "records": ds.record_count
        }
        for ds in datasets
    ]
    
    # Allocation overlap sample
    allocations = db.query(Allocation).order_by(Allocation.created_at.desc()).limit(5).all()
    alloc_overlap = [
        {
            "allocation_id": alloc.id,
            "algorithm": alloc.algorithm,
            "average_delta": alloc.metrics.get("average_delta", 0.0) if alloc.metrics else 0.0,
            "min_delta": alloc.metrics.get("min_delta", 0.0) if alloc.metrics else 0.0
        }
        for alloc in allocations
    ]
    
    return DashboardAnalyticsOut(
        total_datasets=total_datasets,
        total_agents=total_agents,
        total_allocations=total_allocations,
        active_investigations=active_investigations,
        detected_leaks=detected_leaks,
        highest_risk_agent=highest_risk_agent,
        highest_risk_score=max_score,
        average_guilt_probability=avg_guilt_prob,
        agent_risk_comparison=agent_risk_comp,
        leakage_history=leakage_hist,
        dataset_distribution=ds_dist,
        allocation_overlap=alloc_overlap
    )
