from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database.session import get_db
from app.models.models import Allocation, Dataset
from app.schemas.schemas import AllocationRunRequest, AllocationOut, OverlapMatrixOut
from app.services.allocation_service import run_dataset_allocation, get_allocation_overlap_matrix
from app.services.audit_service import log_action

router = APIRouter(prefix="/allocations", tags=["Allocations"])

@router.get("", response_model=List[AllocationOut])
def list_allocations(dataset_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Allocation)
    if dataset_id:
        query = query.filter(Allocation.dataset_id == dataset_id)
    return query.order_by(Allocation.created_at.desc()).all()

@router.post("", response_model=AllocationOut)
def execute_allocation(alloc_in: AllocationRunRequest, db: Session = Depends(get_db)):
    try:
        allocation = run_dataset_allocation(
            db=db,
            dataset_id=alloc_in.dataset_id,
            algorithm=alloc_in.algorithm,
            allow_fake_objects=alloc_in.allow_fake_objects,
            fake_objects_budget=alloc_in.fake_objects_budget
        )
        log_action(db, "RUN_ALLOCATION", details={"allocation_id": allocation.id, "algorithm": alloc_in.algorithm})
        return allocation
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Allocation engine failed: {str(e)}")

@router.get("/{allocation_id}", response_model=AllocationOut)
def get_allocation(allocation_id: int, db: Session = Depends(get_db)):
    allocation = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")
    return allocation

@router.get("/{allocation_id}/matrix", response_model=OverlapMatrixOut)
def get_overlap_matrix(allocation_id: int, db: Session = Depends(get_db)):
    try:
        return get_allocation_overlap_matrix(db, allocation_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.post("/{allocation_id}/optimize", response_model=AllocationOut)
def optimize_allocation(allocation_id: int, db: Session = Depends(get_db)):
    existing = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Allocation not found")
        
    # Pick optimal counterpart algorithm
    target_algo = "e-optimal" if existing.algorithm.startswith("e-") else "s-max"
    
    new_alloc = run_dataset_allocation(
        db=db,
        dataset_id=existing.dataset_id,
        algorithm=target_algo,
        allow_fake_objects=existing.allow_fake_objects,
        fake_objects_budget=existing.fake_objects_budget
    )
    log_action(db, "OPTIMIZE_ALLOCATION", details={"original_id": allocation_id, "new_id": new_alloc.id, "target_algo": target_algo})
    return new_alloc
