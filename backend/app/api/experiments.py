from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.models import Experiment
from app.schemas.schemas import ExperimentRunRequest, ExperimentOut
from app.services.experiment_service import run_research_experiment
from app.services.audit_service import log_action

router = APIRouter(prefix="/experiments", tags=["Research Experiments"])

@router.get("", response_model=List[ExperimentOut])
def list_experiments(db: Session = Depends(get_db)):
    return db.query(Experiment).order_by(Experiment.created_at.desc()).all()

@router.post("/run", response_model=ExperimentOut)
def run_experiment(exp_in: ExperimentRunRequest, db: Session = Depends(get_db)):
    exp = run_research_experiment(
        db=db,
        name=exp_in.name,
        guessing_probability_p=exp_in.guessing_probability_p,
        dataset_size=exp_in.dataset_size,
        agent_count=exp_in.agent_count,
        sample_size_min=exp_in.sample_size_min,
        sample_size_max=exp_in.sample_size_max,
        fake_objects_budget=exp_in.fake_objects_budget,
        algorithms=exp_in.algorithms
    )
    log_action(db, "RUN_EXPERIMENT", details={"experiment_id": exp.id, "name": exp.name})
    return exp

@router.get("/{experiment_id}", response_model=ExperimentOut)
def get_experiment(experiment_id: int, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp
