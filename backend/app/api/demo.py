from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.demo_service import initialize_demo_data
from app.services.audit_service import log_action

router = APIRouter(prefix="/demo", tags=["Demo Mode"])

@router.post("/init")
def init_demo(db: Session = Depends(get_db)):
    try:
        result = initialize_demo_data(db)
        log_action(db, "INITIALIZE_DEMO", details=result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize demo data: {str(e)}")
