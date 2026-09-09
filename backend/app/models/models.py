import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, Table
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="distributor")  # distributor, auditor, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    record_count = Column(Integer, default=0)
    schema_info = Column(JSON, nullable=False)  # list of column specs {name, type, sensitive}
    sensitive_fields = Column(JSON, default=list)  # list of field names
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    data_objects = relationship("DataObject", back_populates="dataset", cascade="all, delete-orphan")
    allocations = relationship("Allocation", back_populates="dataset", cascade="all, delete-orphan")
    leaks = relationship("Leak", back_populates="dataset", cascade="all, delete-orphan")

class DataObject(Base):
    __tablename__ = "data_objects"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    object_key = Column(String, index=True, nullable=False)  # unique object identifier or hash
    data_payload = Column(JSON, nullable=False)  # actual row record as key-value JSON
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="data_objects")
    agent_allocations = relationship("AgentDataObject", back_populates="data_object", cascade="all, delete-orphan")

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    organization = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    suspicion_score = Column(Float, default=0.0)  # Latest calculated guilt score
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    requests = relationship("AgentRequest", back_populates="agent", cascade="all, delete-orphan")
    allocated_objects = relationship("AgentDataObject", back_populates="agent", cascade="all, delete-orphan")
    fake_objects = relationship("FakeObject", back_populates="agent", cascade="all, delete-orphan")
    guilt_scores = relationship("GuiltScore", back_populates="agent", cascade="all, delete-orphan")

class AgentRequest(Base):
    __tablename__ = "agent_requests"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    request_type = Column(String, nullable=False)  # 'EXPLICIT' or 'SAMPLE'
    sample_size = Column(Integer, nullable=True)   # mi for SAMPLE
    conditions = Column(JSON, nullable=True)       # filter dict/expression for EXPLICIT
    max_fake_objects = Column(Integer, default=5) # bi
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    agent = relationship("Agent", back_populates="requests")
    dataset = relationship("Dataset")

class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    algorithm = Column(String, nullable=False)  # e-random, e-optimal, s-random, s-overlap, s-sum, s-max
    fake_objects_budget = Column(Integer, default=0) # B
    allow_fake_objects = Column(Boolean, default=True)
    metrics = Column(JSON, nullable=True)  # average_delta, min_delta, relative_overlap_sum, max_relative_overlap
    status = Column(String, default="COMPLETED")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="allocations")
    agent_objects = relationship("AgentDataObject", back_populates="allocation", cascade="all, delete-orphan")
    fake_objects = relationship("FakeObject", back_populates="allocation", cascade="all, delete-orphan")
    investigations = relationship("Investigation", back_populates="allocation")

class AgentDataObject(Base):
    __tablename__ = "agent_data_objects"

    id = Column(Integer, primary_key=True, index=True)
    allocation_id = Column(Integer, ForeignKey("allocations.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    data_object_id = Column(Integer, ForeignKey("data_objects.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    allocation = relationship("Allocation", back_populates="agent_objects")
    agent = relationship("Agent", back_populates="allocated_objects")
    data_object = relationship("DataObject", back_populates="agent_allocations")

class FakeObject(Base):
    __tablename__ = "fake_objects"

    id = Column(Integer, primary_key=True, index=True)
    allocation_id = Column(Integer, ForeignKey("allocations.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    object_key = Column(String, index=True, nullable=False)
    fake_payload = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    allocation = relationship("Allocation", back_populates="fake_objects")
    agent = relationship("Agent", back_populates="fake_objects")

class Leak(Base):
    __tablename__ = "leaks"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    source_description = Column(Text, nullable=True) # e.g. "Dark web forum drop"
    total_leaked_records = Column(Integer, default=0)
    discovered_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="leaks")
    leaked_objects = relationship("LeakedObject", back_populates="leak", cascade="all, delete-orphan")
    investigations = relationship("Investigation", back_populates="leak", cascade="all, delete-orphan")

class LeakedObject(Base):
    __tablename__ = "leaked_objects"

    id = Column(Integer, primary_key=True, index=True)
    leak_id = Column(Integer, ForeignKey("leaks.id", ondelete="CASCADE"), nullable=False)
    object_key = Column(String, index=True, nullable=False)
    payload = Column(JSON, nullable=False)
    is_fake = Column(Boolean, default=False)
    matched_data_object_id = Column(Integer, ForeignKey("data_objects.id", ondelete="SET NULL"), nullable=True)
    matched_fake_object_id = Column(Integer, ForeignKey("fake_objects.id", ondelete="SET NULL"), nullable=True)

    leak = relationship("Leak", back_populates="leaked_objects")

class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(Integer, primary_key=True, index=True)
    leak_id = Column(Integer, ForeignKey("leaks.id", ondelete="CASCADE"), nullable=False)
    allocation_id = Column(Integer, ForeignKey("allocations.id", ondelete="CASCADE"), nullable=False)
    guessing_probability_p = Column(Float, default=0.2) # p
    matched_records_count = Column(Integer, default=0)
    unmatched_records_count = Column(Integer, default=0)
    fake_records_found_count = Column(Integer, default=0)
    most_suspicious_agent_id = Column(Integer, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    summary_report = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    leak = relationship("Leak", back_populates="investigations")
    allocation = relationship("Allocation", back_populates="investigations")
    guilt_scores = relationship("GuiltScore", back_populates="investigation", cascade="all, delete-orphan")

class GuiltScore(Base):
    __tablename__ = "guilt_scores"

    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(Integer, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    guilt_probability = Column(Float, nullable=False)  # Pr(Gi|S)
    matched_object_count = Column(Integer, default=0)
    fake_object_count = Column(Integer, default=0)

    investigation = relationship("Investigation", back_populates="guilt_scores")
    agent = relationship("Agent", back_populates="guilt_scores")

class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    parameters = Column(JSON, nullable=False) # p, num_agents, dataset_size, load_ratio, algorithm, etc.
    results = Column(JSON, nullable=False)    # metrics over runs
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False) # e.g. "UPLOAD_DATASET", "RUN_ALLOCATION", "INVESTIGATE_LEAK"
    details = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
