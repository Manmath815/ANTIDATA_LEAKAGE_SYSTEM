export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Dataset {
  id: number;
  name: string;
  description?: string;
  record_count: number;
  schema_info: Array<{ name: string; type: string; sensitive: boolean }>;
  sensitive_fields: string[];
  created_at: string;
}

export interface DataObject {
  id: number;
  dataset_id: number;
  object_key: string;
  data_payload: Record<string, any>;
  created_at: string;
}

export interface Agent {
  id: number;
  name: string;
  organization?: string;
  contact_email?: string;
  is_active: boolean;
  suspicion_score: number;
  created_at: string;
}

export interface AgentRequest {
  id: number;
  agent_id: number;
  dataset_id: number;
  request_type: 'EXPLICIT' | 'SAMPLE';
  sample_size?: number;
  conditions?: Record<string, any>;
  max_fake_objects: number;
  created_at: string;
}

export interface Allocation {
  id: number;
  dataset_id: number;
  algorithm: 'e-random' | 'e-optimal' | 's-random' | 's-overlap' | 's-sum' | 's-max';
  fake_objects_budget: number;
  allow_fake_objects: boolean;
  metrics?: {
    average_delta: number;
    min_delta: number;
  };
  status: string;
  created_at: string;
}

export interface OverlapMatrix {
  agent_ids?: number[];
  agents: string[];
  matrix: number[][];
  relative_overlap_matrix: number[][];
  average_delta: number;
  min_delta: number;
}

export interface GuiltScore {
  agent_id: number;
  agent_name: string;
  guilt_probability: number;
  matched_object_count: number;
  fake_object_count: number;
}

export interface Investigation {
  id: number;
  leak_id: number;
  allocation_id: number;
  guessing_probability_p: number;
  matched_records_count: number;
  unmatched_records_count: number;
  fake_records_found_count: number;
  most_suspicious_agent?: string;
  guilt_scores: GuiltScore[];
  summary_report?: Record<string, any>;
  created_at: string;
}

export interface DashboardAnalytics {
  total_datasets: number;
  total_agents: number;
  total_allocations: number;
  active_investigations: number;
  detected_leaks: number;
  highest_risk_agent?: string;
  highest_risk_score: number;
  average_guilt_probability: number;
  agent_risk_comparison: Array<{
    agent_id: number;
    agent_name: string;
    suspicion_score: number;
    is_active: boolean;
  }>;
  leakage_history: Array<{
    id: number;
    date: string;
    matched_records: number;
    unmatched_records: number;
    fake_records: number;
  }>;
  dataset_distribution: Array<{
    name: string;
    records: number;
  }>;
  allocation_overlap: Array<{
    allocation_id: number;
    algorithm: string;
    average_delta: number;
    min_delta: number;
  }>;
}

export interface Experiment {
  id: number;
  name: string;
  parameters: Record<string, any>;
  results: {
    p_guilt_curve?: Array<{ p: number; guilt_U1: number; guilt_U2: number }>;
    load_curve?: Array<Record<string, any>>;
    parameters_used?: Record<string, any>;
  };
  created_at: string;
}
