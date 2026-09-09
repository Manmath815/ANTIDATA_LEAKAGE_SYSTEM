from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database.session import get_db
from app.models.models import Agent, AgentRequest
from app.schemas.schemas import AgentCreate, AgentUpdate, AgentOut, AgentRequestCreate, AgentRequestOut
from app.services.agent_service import create_agent, update_agent, create_agent_request, get_agent_details
from app.services.audit_service import log_action

router = APIRouter(prefix="/agents", tags=["Agents"])

@router.get("", response_model=List[AgentOut])
def list_agents(db: Session = Depends(get_db)):
    return db.query(Agent).order_by(Agent.name).all()

@router.post("", response_model=AgentOut, status_code=status.HTTP_201_CREATED)
def add_agent(agent_in: AgentCreate, db: Session = Depends(get_db)):
    existing = db.query(Agent).filter(Agent.name == agent_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Agent with this name already exists")
    agent = create_agent(db, name=agent_in.name, organization=agent_in.organization, contact_email=agent_in.contact_email)
    log_action(db, "ADD_AGENT", details={"agent_id": agent.id, "name": agent.name})
    return agent

@router.get("/{agent_id}/details")
def read_agent_details(agent_id: int, db: Session = Depends(get_db)):
    details = get_agent_details(db, agent_id)
    if not details:
        raise HTTPException(status_code=404, detail="Agent not found")
    return details

@router.put("/{agent_id}", response_model=AgentOut)
def edit_agent(agent_id: int, agent_in: AgentUpdate, db: Session = Depends(get_db)):
    agent = update_agent(
        db, agent_id=agent_id, name=agent_in.name,
        organization=agent_in.organization, contact_email=agent_in.contact_email,
        is_active=agent_in.is_active
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    log_action(db, "UPDATE_AGENT", details={"agent_id": agent.id})
    return agent

@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_or_delete_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()
    log_action(db, "DELETE_AGENT", details={"agent_id": agent_id})
    return None

# --- Agent Requests ---
@router.post("/requests", response_model=AgentRequestOut)
def set_agent_request(req_in: AgentRequestCreate, db: Session = Depends(get_db)):
    req = create_agent_request(
        db=db,
        agent_id=req_in.agent_id,
        dataset_id=req_in.dataset_id,
        request_type=req_in.request_type,
        sample_size=req_in.sample_size,
        conditions=req_in.conditions,
        max_fake_objects=req_in.max_fake_objects
    )
    log_action(db, "CONFIGURE_AGENT_REQUEST", details={"request_id": req.id, "agent_id": req.agent_id, "type": req.request_type})
    return req

@router.get("/requests/{dataset_id}", response_model=List[AgentRequestOut])
def get_dataset_agent_requests(dataset_id: int, db: Session = Depends(get_db)):
    return db.query(AgentRequest).filter(AgentRequest.dataset_id == dataset_id).all()
