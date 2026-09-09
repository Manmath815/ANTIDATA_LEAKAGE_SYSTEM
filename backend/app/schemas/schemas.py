from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: Optional[str] = "distributor"

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Dataset Schemas ---
class ColumnSpec(BaseModel):
    name: str
    type: str  # string, number, integer, boolean, date
    sensitive: bool = False

class DatasetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sensitive_fields: List[str] = []

class DatasetOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    record_count: int
    schema_info: List[Dict[str, Any]]
    sensitive_fields: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

class DataObjectOut(BaseModel):
    id: int
    dataset_id: int
    object_key: str
    data_payload: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Agent Schemas ---
class AgentCreate(BaseModel):
    name: str
    organization: Optional[str] = None
    contact_email: Optional[str] = None

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    organization: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: Optional[bool] = None

class AgentOut(BaseModel):
    id: int
    name: str
    organization: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: bool
    suspicion_score: float
    created_at: datetime

    class Config:
        from_attributes = True

class AgentRequestCreate(BaseModel):
    agent_id: int
    dataset_id: int
    request_type: str # EXPLICIT or SAMPLE
    sample_size: Optional[int] = None
    conditions: Optional[Dict[str, Any]] = None
    max_fake_objects: int = 5

class AgentRequestOut(BaseModel):
    id: int
    agent_id: int
    dataset_id: int
    request_type: str
    sample_size: Optional[int] = None
    conditions: Optional[Dict[str, Any]] = None
    max_fake_objects: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Allocation Schemas ---
class AllocationRunRequest(BaseModel):
    dataset_id: int
    algorithm: str # e-random, e-optimal, s-random, s-overlap, s-sum, s-max
    allow_fake_objects: bool = True
    fake_objects_budget: int = 10

class AllocationOut(BaseModel):
    id: int
    dataset_id: int
    algorithm: str
    fake_objects_budget: int
    allow_fake_objects: bool
    metrics: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class OverlapMatrixOut(BaseModel):
    agents: List[str]
    matrix: List[List[int]]
    relative_overlap_matrix: List[List[float]]
    average_delta: float
    min_delta: float

# --- Leak & Investigation Schemas ---
class LeakCreate(BaseModel):
    dataset_id: int
    title: str
    source_description: Optional[str] = None
    leaked_records: List[Dict[str, Any]]  # parsed records or key-value JSON

class InvestigationRunRequest(BaseModel):
    allocation_id: int
    leak_id: Optional[int] = None
    leaked_records: Optional[List[Dict[str, Any]]] = None # raw upload/paste if leak_id not created yet
    title: Optional[str] = "Leak Investigation"
    guessing_probability_p: float = Field(0.2, ge=0.0001, le=0.9999)

class GuiltScoreOut(BaseModel):
    agent_id: int
    agent_name: str
    guilt_probability: float
    matched_object_count: int
    fake_object_count: int

class InvestigationOut(BaseModel):
    id: int
    leak_id: int
    allocation_id: int
    guessing_probability_p: float
    matched_records_count: int
    unmatched_records_count: int
    fake_records_found_count: int
    most_suspicious_agent: Optional[str] = None
    guilt_scores: List[GuiltScoreOut]
    summary_report: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Fake Record Schemas ---
class FakeRecordGenerateRequest(BaseModel):
    dataset_id: int
    count: int = 5
    conditions: Optional[Dict[str, Any]] = None

class FakeObjectOut(BaseModel):
    id: int
    allocation_id: int
    agent_id: int
    object_key: str
    fake_payload: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Experiment Schemas ---
class ExperimentRunRequest(BaseModel):
    name: str = "Simulation Experiment"
    guessing_probability_p: float = 0.2
    dataset_size: int = 50
    agent_count: int = 5
    sample_size_min: int = 5
    sample_size_max: int = 15
    fake_objects_budget: int = 10
    algorithms: List[str] = ["s-random", "s-overlap", "s-sum", "s-max", "e-random", "e-optimal"]

class ExperimentOut(BaseModel):
    id: int
    name: str
    parameters: Dict[str, Any]
    results: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Analytics Schemas ---
class DashboardAnalyticsOut(BaseModel):
    total_datasets: int
    total_agents: int
    total_allocations: int
    active_investigations: int
    detected_leaks: int
    highest_risk_agent: Optional[str]
    highest_risk_score: float
    average_guilt_probability: float
    agent_risk_comparison: List[Dict[str, Any]]
    leakage_history: List[Dict[str, Any]]
    dataset_distribution: List[Dict[str, Any]]
    allocation_overlap: List[Dict[str, Any]]
