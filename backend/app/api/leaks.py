from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import json
from app.database.session import get_db
from app.models.models import Investigation, Leak, GuiltScore, Agent
from app.schemas.schemas import InvestigationRunRequest, InvestigationOut, GuiltScoreOut
from app.services.leak_service import investigate_leak
from app.services.dataset_service import parse_uploaded_file
from app.services.report_service import generate_investigation_markdown_report
from app.services.audit_service import log_action

router = APIRouter(prefix="/leaks", tags=["Leak Investigation"])

@router.get("/investigations", response_model=List[InvestigationOut])
def list_investigations(db: Session = Depends(get_db)):
    investigations = db.query(Investigation).order_by(Investigation.created_at.desc()).all()
    results = []
    for inv in investigations:
        g_scores = db.query(GuiltScore).filter(GuiltScore.investigation_id == inv.id).all()
        score_outs = []
        for g in g_scores:
            a = db.query(Agent).filter(Agent.id == g.agent_id).first()
            score_outs.append(GuiltScoreOut(
                agent_id=g.agent_id,
                agent_name=a.name if a else f"Agent {g.agent_id}",
                guilt_probability=g.guilt_probability,
                matched_object_count=g.matched_object_count,
                fake_object_count=g.fake_object_count
            ))
            
        most_suspicious_name = None
        if inv.most_suspicious_agent_id:
            m_agent = db.query(Agent).filter(Agent.id == inv.most_suspicious_agent_id).first()
            most_suspicious_name = m_agent.name if m_agent else f"Agent #{inv.most_suspicious_agent_id}"
            
        results.append(InvestigationOut(
            id=inv.id,
            leak_id=inv.leak_id,
            allocation_id=inv.allocation_id,
            guessing_probability_p=inv.guessing_probability_p,
            matched_records_count=inv.matched_records_count,
            unmatched_records_count=inv.unmatched_records_count,
            fake_records_found_count=inv.fake_records_found_count,
            most_suspicious_agent=most_suspicious_name,
            guilt_scores=score_outs,
            summary_report=inv.summary_report,
            created_at=inv.created_at
        ))
    return results

@router.post("/investigate", response_model=InvestigationOut)
def run_leak_investigation(req_in: InvestigationRunRequest, db: Session = Depends(get_db)):
    if not req_in.leaked_records:
        raise HTTPException(status_code=400, detail="No leaked records provided for investigation")
        
    try:
        inv = investigate_leak(
            db=db,
            allocation_id=req_in.allocation_id,
            leaked_records=req_in.leaked_records,
            title=req_in.title or "Discovered Leak Investigation",
            guessing_probability_p=req_in.guessing_probability_p
        )
        log_action(db, "INVESTIGATE_LEAK", details={"investigation_id": inv.id, "allocation_id": req_in.allocation_id})
        
        g_scores = db.query(GuiltScore).filter(GuiltScore.investigation_id == inv.id).all()
        score_outs = []
        for g in g_scores:
            a = db.query(Agent).filter(Agent.id == g.agent_id).first()
            score_outs.append(GuiltScoreOut(
                agent_id=g.agent_id,
                agent_name=a.name if a else f"Agent {g.agent_id}",
                guilt_probability=g.guilt_probability,
                matched_object_count=g.matched_object_count,
                fake_object_count=g.fake_object_count
            ))
            
        most_suspicious_name = None
        if inv.most_suspicious_agent_id:
            m_agent = db.query(Agent).filter(Agent.id == inv.most_suspicious_agent_id).first()
            most_suspicious_name = m_agent.name if m_agent else f"Agent #{inv.most_suspicious_agent_id}"
            
        return InvestigationOut(
            id=inv.id,
            leak_id=inv.leak_id,
            allocation_id=inv.allocation_id,
            guessing_probability_p=inv.guessing_probability_p,
            matched_records_count=inv.matched_records_count,
            unmatched_records_count=inv.unmatched_records_count,
            fake_records_found_count=inv.fake_records_found_count,
            most_suspicious_agent=most_suspicious_name,
            guilt_scores=score_outs,
            summary_report=inv.summary_report,
            created_at=inv.created_at
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.get("/investigations/{investigation_id}/report")
def export_investigation_report(investigation_id: int, format: str = "markdown", db: Session = Depends(get_db)):
    try:
        md_text = generate_investigation_markdown_report(db, investigation_id)
        if format.lower() == "markdown":
            return Response(content=md_text, media_type="text/markdown", headers={"Content-Disposition": f"attachment; filename=investigation_report_{investigation_id}.md"})
        else:
            return {"markdown": md_text}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
