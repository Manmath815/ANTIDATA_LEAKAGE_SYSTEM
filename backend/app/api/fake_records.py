from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.models import Dataset, FakeObject
from app.schemas.schemas import FakeRecordGenerateRequest, FakeObjectOut
from app.algorithms.fake_records import generate_fake_object_payload
from app.services.audit_service import log_action

router = APIRouter(prefix="/fake-records", tags=["Fake Records"])

@router.post("/generate")
def generate_fake_records(req_in: FakeRecordGenerateRequest, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == req_in.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    generated = []
    for _ in range(req_in.count):
        k, payload = generate_fake_object_payload(dataset.schema_info, req_in.conditions)
        generated.append({"object_key": k, "fake_payload": payload})
        
    log_action(db, "GENERATE_FAKE_RECORDS", details={"dataset_id": req_in.dataset_id, "count": req_in.count})
    return {"dataset_id": req_in.dataset_id, "count": len(generated), "fake_records": generated}

@router.get("/allocation/{allocation_id}", response_model=List[FakeObjectOut])
def get_allocation_fake_objects(allocation_id: int, db: Session = Depends(get_db)):
    return db.query(FakeObject).filter(FakeObject.allocation_id == allocation_id).all()
