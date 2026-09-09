from sqlalchemy.orm import Session
from app.models.models import Agent, AgentRequest, AgentDataObject, FakeObject, GuiltScore
from typing import List, Dict, Any, Optional

def create_agent(db: Session, name: str, organization: Optional[str], contact_email: Optional[str]) -> Agent:
    agent = Agent(
        name=name,
        organization=organization,
        contact_email=contact_email,
        is_active=True,
        suspicion_score=0.0
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent

def update_agent(db: Session, agent_id: int, name: Optional[str], organization: Optional[str], contact_email: Optional[str], is_active: Optional[bool]) -> Optional[Agent]:
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        return None
    if name is not None:
        agent.name = name
    if organization is not None:
        agent.organization = organization
    if contact_email is not None:
        agent.contact_email = contact_email
    if is_active is not None:
        agent.is_active = is_active
    db.commit()
    db.refresh(agent)
    return agent

def create_agent_request(
    db: Session,
    agent_id: int,
    dataset_id: int,
    request_type: str, # EXPLICIT or SAMPLE
    sample_size: Optional[int] = None,
    conditions: Optional[Dict[str, Any]] = None,
    max_fake_objects: int = 5
) -> AgentRequest:
    # Delete existing request for same agent and dataset if present
    existing = db.query(AgentRequest).filter(
        AgentRequest.agent_id == agent_id,
        AgentRequest.dataset_id == dataset_id
    ).first()
    if existing:
        db.delete(existing)
        db.flush()
        
    req = AgentRequest(
        agent_id=agent_id,
        dataset_id=dataset_id,
        request_type=request_type.upper(),
        sample_size=sample_size,
        conditions=conditions or {},
        max_fake_objects=max_fake_objects
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req

def get_agent_details(db: Session, agent_id: int) -> Optional[Dict[str, Any]]:
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        return None
        
    requests = db.query(AgentRequest).filter(AgentRequest.agent_id == agent_id).all()
    allocated_count = db.query(AgentDataObject).filter(AgentDataObject.agent_id == agent_id).count()
    fake_count = db.query(FakeObject).filter(FakeObject.agent_id == agent_id).count()
    
    guilt_history = db.query(GuiltScore).filter(GuiltScore.agent_id == agent_id).all()
    history = [
        {
            "investigation_id": g.investigation_id,
            "guilt_probability": g.guilt_probability,
            "matched_object_count": g.matched_object_count,
            "fake_object_count": g.fake_object_count
        }
        for g in guilt_history
    ]
    
    return {
        "agent": agent,
        "requests": requests,
        "total_allocated_records": allocated_count,
        "total_fake_records": fake_count,
        "suspicion_history": history
    }
