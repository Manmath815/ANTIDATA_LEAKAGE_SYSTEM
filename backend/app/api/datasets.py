from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from app.database.session import get_db
from app.models.models import Dataset, DataObject
from app.schemas.schemas import DatasetOut, DataObjectOut
from app.services.dataset_service import create_dataset_with_records, parse_uploaded_file
from app.services.audit_service import log_action

router = APIRouter(prefix="/datasets", tags=["Datasets"])

@router.get("", response_model=List[DatasetOut])
def list_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).order_by(Dataset.created_at.desc()).all()

@router.post("/upload", response_model=DatasetOut)
async def upload_dataset(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    sensitive_fields: Optional[str] = Form(None), # comma-separated or json array
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    try:
        records = parse_uploaded_file(contents, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse uploaded file: {str(e)}")
        
    if not records:
        raise HTTPException(status_code=400, detail="Uploaded file contains no valid data records")
        
    sens_list = []
    if sensitive_fields:
        try:
            sens_list = json.loads(sensitive_fields)
        except Exception:
            sens_list = [s.strip() for s in sensitive_fields.split(",") if s.strip()]
            
    dataset = create_dataset_with_records(
        db=db,
        name=name,
        description=description,
        records=records,
        sensitive_fields=sens_list
    )
    
    log_action(db, "UPLOAD_DATASET", details={"dataset_id": dataset.id, "name": dataset.name, "record_count": dataset.record_count})
    return dataset

@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.get("/{dataset_id}/records", response_model=List[DataObjectOut])
def get_dataset_records(dataset_id: int, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return db.query(DataObject).filter(DataObject.dataset_id == dataset_id).offset(offset).limit(limit).all()

@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    db.delete(dataset)
    db.commit()
    log_action(db, "DELETE_DATASET", details={"dataset_id": dataset_id})
    return None
