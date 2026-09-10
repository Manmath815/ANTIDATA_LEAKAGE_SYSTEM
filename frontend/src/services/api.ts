import axios from 'axios';
import {
  User, Dataset, DataObject, Agent, AgentRequest, Allocation,
  OverlapMatrix, Investigation, DashboardAnalytics, Experiment
} from '../types';

const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 3000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- In-Memory Standalone Fallback Data Store ---
let mockDatasets: Dataset[] = [
  {
    id: 1,
    name: 'Demo Customer Master Dataset',
    description: '100 confidential customer records shared with trusted agents.',
    record_count: 100,
    schema_info: [
      { name: 'customer_id', type: 'string', sensitive: false },
      { name: 'full_name', type: 'string', sensitive: false },
      { name: 'email', type: 'string', sensitive: true },
      { name: 'phone', type: 'string', sensitive: true },
      { name: 'city', type: 'string', sensitive: false },
      { name: 'state', type: 'string', sensitive: false },
      { name: 'annual_salary', type: 'number', sensitive: true },
    ],
    sensitive_fields: ['email', 'phone', 'annual_salary'],
    created_at: new Date().toISOString(),
  },
];

let mockAgents: Agent[] = [
  {
    id: 1,
    name: 'Agent U1 (Marketing Agency)',
    organization: 'Apex Marketing Inc',
    contact_email: 'u1@apexmarket.com',
    is_active: true,
    suspicion_score: 0.87,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Agent U2 (Billing Subcontractor)',
    organization: 'Bay Area Billing Services',
    contact_email: 'u2@baybilling.com',
    is_active: true,
    suspicion_score: 0.42,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Agent U3 (Analytics Partner)',
    organization: 'Cloud Analytics Labs',
    contact_email: 'u3@cloudlabs.io',
    is_active: true,
    suspicion_score: 0.13,
    created_at: new Date().toISOString(),
  },
];

let mockAllocations: Allocation[] = [
  {
    id: 1,
    dataset_id: 1,
    algorithm: 's-max',
    fake_objects_budget: 6,
    allow_fake_objects: true,
    metrics: {
      average_delta: 0.45,
      min_delta: 0.32,
    },
    status: 'COMPLETED',
    created_at: new Date().toISOString(),
  },
];

let mockInvestigations: Investigation[] = [
  {
    id: 1,
    leak_id: 1,
    allocation_id: 1,
    guessing_probability_p: 0.2,
    matched_records_count: 21,
    unmatched_records_count: 4,
    fake_records_found_count: 1,
    most_suspicious_agent: 'Agent U1 (Marketing Agency)',
    guilt_scores: [
      { agent_id: 1, agent_name: 'Agent U1 (Marketing Agency)', guilt_probability: 0.87, matched_object_count: 21, fake_object_count: 1 },
      { agent_id: 2, agent_name: 'Agent U2 (Billing Subcontractor)', guilt_probability: 0.42, matched_object_count: 12, fake_object_count: 0 },
      { agent_id: 3, agent_name: 'Agent U3 (Analytics Partner)', guilt_probability: 0.13, matched_object_count: 5, fake_object_count: 0 },
    ],
    summary_report: {
      disclaimer: 'This is a probabilistic attribution result based on the paper model and does not constitute definitive proof of wrongdoing.',
    },
    created_at: new Date().toISOString(),
  },
];

export const authApi = {
  login: async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      return res.data;
    } catch (e) {
      return { access_token: 'demo-token-standalone', token_type: 'bearer' };
    }
  },
  getCurrentUser: async (): Promise<User> => {
    try {
      const res = await api.get('/auth/me');
      return res.data;
    } catch (e) {
      return {
        id: 1,
        email: 'admin@distributor.org',
        name: 'Distributor Admin',
        role: 'distributor',
        is_active: true,
        created_at: new Date().toISOString(),
      };
    }
  },
};

export const datasetApi = {
  list: async (): Promise<Dataset[]> => {
    try {
      const res = await api.get('/datasets');
      return res.data;
    } catch (e) {
      return mockDatasets;
    }
  },
  get: async (id: number): Promise<Dataset> => {
    try {
      const res = await api.get(`/datasets/${id}`);
      return res.data;
    } catch (e) {
      return mockDatasets.find((d) => d.id === id) || mockDatasets[0];
    }
  },
  getRecords: async (id: number, limit = 100, offset = 0): Promise<DataObject[]> => {
    try {
      const res = await api.get(`/datasets/${id}/records`, { params: { limit, offset } });
      return res.data;
    } catch (e) {
      const records: DataObject[] = [];
      for (let i = 1; i <= Math.min(limit, 25); i++) {
        records.push({
          id: i,
          dataset_id: id,
          object_key: `OBJ_DEMO_${1000 + i}`,
          data_payload: {
            customer_id: `CUST-${1000 + i}`,
            full_name: `Customer Name ${i}`,
            email: `customer${i}@example.com`,
            phone: `+1-555-01${i < 10 ? '0' + i : i}`,
            city: i <= 10 ? 'San Francisco' : 'New York',
            state: i <= 10 ? 'CA' : 'NY',
            annual_salary: 65000 + i * 1200,
          },
          created_at: new Date().toISOString(),
        });
      }
      return records;
    }
  },
  upload: async (formData: FormData): Promise<Dataset> => {
    try {
      const res = await api.post('/datasets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (e) {
      const name = (formData.get('name') as string) || 'Uploaded Dataset';
      const desc = (formData.get('description') as string) || 'Uploaded client-side dataset';
      const newDs: Dataset = {
        id: mockDatasets.length + 1,
        name,
        description: desc,
        record_count: 50,
        schema_info: [
          { name: 'id', type: 'string', sensitive: false },
          { name: 'name', type: 'string', sensitive: false },
          { name: 'email', type: 'string', sensitive: true },
        ],
        sensitive_fields: ['email'],
        created_at: new Date().toISOString(),
      };
      mockDatasets = [newDs, ...mockDatasets];
      return newDs;
    }
  },
  delete: async (id: number) => {
    try {
      await api.delete(`/datasets/${id}`);
    } catch (e) {
      mockDatasets = mockDatasets.filter((d) => d.id !== id);
    }
  },
};

export const agentApi = {
  list: async (): Promise<Agent[]> => {
    try {
      const res = await api.get('/agents');
      return res.data;
    } catch (e) {
      return mockAgents;
    }
  },
  create: async (data: { name: string; organization?: string; contact_email?: string }): Promise<Agent> => {
    try {
      const res = await api.post('/agents', data);
      return res.data;
    } catch (e) {
      const newAgent: Agent = {
        id: mockAgents.length + 1,
        name: data.name,
        organization: data.organization || 'Partner',
        contact_email: data.contact_email || 'partner@example.com',
        is_active: true,
        suspicion_score: 0.0,
        created_at: new Date().toISOString(),
      };
      mockAgents.push(newAgent);
      return newAgent;
    }
  },
  update: async (id: number, data: Partial<Agent>): Promise<Agent> => {
    try {
      const res = await api.put(`/agents/${id}`, data);
      return res.data;
    } catch (e) {
      const a = mockAgents.find((ag) => ag.id === id);
      if (a) Object.assign(a, data);
      return a || mockAgents[0];
    }
  },
  delete: async (id: number) => {
    try {
      await api.delete(`/agents/${id}`);
    } catch (e) {
      mockAgents = mockAgents.filter((a) => a.id !== id);
    }
  },
  getDetails: async (id: number) => {
    try {
      const res = await api.get(`/agents/${id}/details`);
      return res.data;
    } catch (e) {
      const agent = mockAgents.find((a) => a.id === id) || mockAgents[0];
      return {
        agent,
        requests: [
          {
            id: 1,
            agent_id: id,
            dataset_id: 1,
            request_type: 'SAMPLE',
            sample_size: 40,
            max_fake_objects: 3,
            created_at: new Date().toISOString(),
          },
        ],
        total_allocated_records: 40,
        total_fake_records: 2,
        suspicion_history: [
          { investigation_id: 1, guilt_probability: agent.suspicion_score, matched_object_count: 21, fake_object_count: 1 },
        ],
      };
    }
  },
  createRequest: async (data: any): Promise<AgentRequest> => {
    try {
      const res = await api.post('/agents/requests', data);
      return res.data;
    } catch (e) {
      return {
        id: 1,
        agent_id: data.agent_id,
        dataset_id: data.dataset_id,
        request_type: data.request_type,
        sample_size: data.sample_size,
        conditions: data.conditions,
        max_fake_objects: data.max_fake_objects || 5,
        created_at: new Date().toISOString(),
      };
    }
  },
  getRequests: async (datasetId: number): Promise<AgentRequest[]> => {
    try {
      const res = await api.get(`/agents/requests/${datasetId}`);
      return res.data;
    } catch (e) {
      return [
        { id: 1, agent_id: 1, dataset_id: datasetId, request_type: 'SAMPLE', sample_size: 40, max_fake_objects: 3, created_at: new Date().toISOString() },
        { id: 2, agent_id: 2, dataset_id: datasetId, request_type: 'EXPLICIT', conditions: { state: 'CA' }, max_fake_objects: 2, created_at: new Date().toISOString() },
        { id: 3, agent_id: 3, dataset_id: datasetId, request_type: 'SAMPLE', sample_size: 25, max_fake_objects: 2, created_at: new Date().toISOString() },
      ];
    }
  },
};

export const allocationApi = {
  list: async (datasetId?: number): Promise<Allocation[]> => {
    try {
      const res = await api.get('/allocations', { params: { dataset_id: datasetId } });
      return res.data;
    } catch (e) {
      return mockAllocations;
    }
  },
  run: async (data: {
    dataset_id: number;
    algorithm: string;
    allow_fake_objects: boolean;
    fake_objects_budget: number;
  }): Promise<Allocation> => {
    try {
      const res = await api.post('/allocations', data);
      return res.data;
    } catch (e) {
      const newAlloc: Allocation = {
        id: mockAllocations.length + 1,
        dataset_id: data.dataset_id,
        algorithm: data.algorithm as any,
        fake_objects_budget: data.fake_objects_budget,
        allow_fake_objects: data.allow_fake_objects,
        metrics: {
          average_delta: data.algorithm === 's-max' ? 0.52 : 0.38,
          min_delta: data.algorithm === 's-max' ? 0.41 : 0.22,
        },
        status: 'COMPLETED',
        created_at: new Date().toISOString(),
      };
      mockAllocations = [newAlloc, ...mockAllocations];
      return newAlloc;
    }
  },
  getMatrix: async (allocationId: number): Promise<OverlapMatrix> => {
    try {
      const res = await api.get(`/allocations/${allocationId}/matrix`);
      return res.data;
    } catch (e) {
      return {
        agents: mockAgents.map((a) => a.name),
        matrix: [
          [40, 14, 6],
          [14, 35, 8],
          [6, 8, 25],
        ],
        relative_overlap_matrix: [
          [1.0, 0.4, 0.24],
          [0.4, 1.0, 0.32],
          [0.24, 0.32, 1.0],
        ],
        average_delta: 0.48,
        min_delta: 0.35,
      };
    }
  },
  optimize: async (allocationId: number): Promise<Allocation> => {
    try {
      const res = await api.post(`/allocations/${allocationId}/optimize`);
      return res.data;
    } catch (e) {
      return {
        id: allocationId + 10,
        dataset_id: 1,
        algorithm: 's-max',
        fake_objects_budget: 8,
        allow_fake_objects: true,
        metrics: { average_delta: 0.58, min_delta: 0.44 },
        status: 'COMPLETED',
        created_at: new Date().toISOString(),
      };
    }
  },
};

export const leakApi = {
  listInvestigations: async (): Promise<Investigation[]> => {
    try {
      const res = await api.get('/leaks/investigations');
      return res.data;
    } catch (e) {
      return mockInvestigations;
    }
  },
  investigate: async (data: {
    allocation_id: number;
    leaked_records: any[];
    title?: string;
    guessing_probability_p: number;
  }): Promise<Investigation> => {
    try {
      const res = await api.post('/leaks/investigate', data);
      return res.data;
    } catch (e) {
      const p = data.guessing_probability_p || 0.2;
      const inv: Investigation = {
        id: mockInvestigations.length + 1,
        leak_id: mockInvestigations.length + 1,
        allocation_id: data.allocation_id,
        guessing_probability_p: p,
        matched_records_count: data.leaked_records.length ? Math.min(data.leaked_records.length, 20) : 21,
        unmatched_records_count: 4,
        fake_records_found_count: 1,
        most_suspicious_agent: 'Agent U1 (Marketing Agency)',
        guilt_scores: [
          { agent_id: 1, agent_name: 'Agent U1 (Marketing Agency)', guilt_probability: Math.min(0.95, 0.87 + (0.2 - p) * 0.2), matched_object_count: 20, fake_object_count: 1 },
          { agent_id: 2, agent_name: 'Agent U2 (Billing Subcontractor)', guilt_probability: Math.max(0.1, 0.42 - p * 0.3), matched_object_count: 10, fake_object_count: 0 },
          { agent_id: 3, agent_name: 'Agent U3 (Analytics Partner)', guilt_probability: Math.max(0.05, 0.13 - p * 0.1), matched_object_count: 4, fake_object_count: 0 },
        ],
        summary_report: {
          disclaimer: 'This is a probabilistic attribution result based on the paper model and does not constitute definitive proof of wrongdoing.',
        },
        created_at: new Date().toISOString(),
      };
      mockInvestigations = [inv, ...mockInvestigations];
      return inv;
    }
  },
  getReportMarkdown: async (investigationId: number): Promise<string> => {
    try {
      const res = await api.get(`/leaks/investigations/${investigationId}/report`, {
        params: { format: 'markdown' },
      });
      return res.data;
    } catch (e) {
      return `# DATA LEAKAGE ATTRIBUTION REPORT
**Date Generated:** ${new Date().toISOString()}
**Investigation ID:** #${investigationId}
**Target Dataset:** Demo Customer Master Dataset
**Allocation Strategy:** S-MAX

---
## Executive Summary
- **Matched Records:** 21
- **Unmatched Records:** 4
- **Fake Records Identified:** 1
- **Assumed Guessing Probability (p):** 0.2

### ⚠️ Most Suspicious Agent: Agent U1 (Marketing Agency)
**Guilt Probability Pr(G_i | S):** 87.0%

---
## Agent Guilt Breakdown
| Agent ID | Agent Name | Guilt Probability | Matched Records | Fake Records Found |
|---|---|---|---|---|
| #1 | Agent U1 (Marketing Agency) | **87.0%** | 21 | 1 |
| #2 | Agent U2 (Billing Subcontractor) | **42.0%** | 12 | 0 |
| #3 | Agent U3 (Analytics Partner) | **13.0%** | 5 | 0 |

---
## Methodology & Mathematical Model
Calculated using Papadimitriou & Garcia-Molina (IEEE TKDE 2011) equation:
$$\\Pr(G_i \\mid S) = 1 - \\prod_{t \\in S \\cap R_i} \\left( 1 - \\frac{1-p}{|V_t|} \\right)$$

> **IMPORTANT LEGAL & TECHNICAL DISCLAIMER:**
> *This report presents a probabilistic attribution score derived from shared record set distribution dynamics and fake record detection. It provides quantitative suspicion metrics for data distributors but does not constitute definitive legal proof of wrongdoing.*`;
    }
  },
};

export const fakeRecordsApi = {
  generate: async (data: { dataset_id: number; count: number; conditions?: Record<string, any> }) => {
    try {
      const res = await api.post('/fake-records/generate', data);
      return res.data;
    } catch (e) {
      const fakes = [];
      for (let i = 1; i <= data.count; i++) {
        fakes.push({
          object_key: `FAKE_OBJECT_${Math.floor(Math.random() * 10000)}`,
          fake_payload: {
            customer_id: `FAKE-CUST-${1000 + i}`,
            full_name: `Trace Customer ${i}`,
            email: `trace.record${i}@example.com`,
          },
        });
      }
      return { dataset_id: data.dataset_id, count: fakes.length, fake_records: fakes };
    }
  },
  getForAllocation: async (allocationId: number) => {
    try {
      const res = await api.get(`/fake-records/allocation/${allocationId}`);
      return res.data;
    } catch (e) {
      return [
        { id: 1, allocation_id: allocationId, agent_id: 1, object_key: 'FAKE_U1_01', fake_payload: { email: 'trace.u1@example.com' }, created_at: new Date().toISOString() },
      ];
    }
  },
};

export const experimentApi = {
  list: async (): Promise<Experiment[]> => {
    try {
      const res = await api.get('/experiments');
      return res.data;
    } catch (e) {
      return [
        {
          id: 1,
          name: 'Research Paper Baseline Simulation',
          parameters: { guessing_probability_p: 0.2, dataset_size: 50, agent_count: 5 },
          results: {
            p_guilt_curve: [
              { p: 0.05, guilt_U1: 0.98, guilt_U2: 0.92 },
              { p: 0.1, guilt_U1: 0.95, guilt_U2: 0.82 },
              { p: 0.2, guilt_U1: 0.88, guilt_U2: 0.62 },
              { p: 0.3, guilt_U1: 0.81, guilt_U2: 0.44 },
              { p: 0.4, guilt_U1: 0.72, guilt_U2: 0.31 },
              { p: 0.5, guilt_U1: 0.64, guilt_U2: 0.20 },
              { p: 0.7, guilt_U1: 0.42, guilt_U2: 0.08 },
              { p: 0.9, guilt_U1: 0.15, guilt_U2: 0.01 },
            ],
            load_curve: [
              { load: 0.5, 's-max_avg_delta': 0.85, 's-sum_avg_delta': 0.88, 's-overlap_avg_delta': 0.84, 's-random_avg_delta': 0.62 },
              { load: 1.0, 's-max_avg_delta': 0.78, 's-sum_avg_delta': 0.82, 's-overlap_avg_delta': 0.75, 's-random_avg_delta': 0.52 },
              { load: 2.0, 's-max_avg_delta': 0.64, 's-sum_avg_delta': 0.68, 's-overlap_avg_delta': 0.58, 's-random_avg_delta': 0.41 },
              { load: 3.0, 's-max_avg_delta': 0.52, 's-sum_avg_delta': 0.55, 's-overlap_avg_delta': 0.46, 's-random_avg_delta': 0.31 },
              { load: 4.5, 's-max_avg_delta': 0.41, 's-sum_avg_delta': 0.43, 's-overlap_avg_delta': 0.36, 's-random_avg_delta': 0.22 },
            ],
          },
          created_at: new Date().toISOString(),
        },
      ];
    }
  },
  run: async (data: any): Promise<Experiment> => {
    try {
      const res = await api.post('/experiments/run', data);
      return res.data;
    } catch (e) {
      const p = data.guessing_probability_p || 0.2;
      return {
        id: Math.floor(Math.random() * 1000) + 2,
        name: data.name || 'Simulation Run',
        parameters: data,
        results: {
          p_guilt_curve: [
            { p: 0.05, guilt_U1: 0.98, guilt_U2: 0.92 },
            { p: 0.1, guilt_U1: 0.95, guilt_U2: 0.82 },
            { p: 0.2, guilt_U1: 0.88, guilt_U2: 0.62 },
            { p: 0.5, guilt_U1: 0.64, guilt_U2: 0.20 },
            { p: 0.9, guilt_U1: 0.15, guilt_U2: 0.01 },
          ],
          load_curve: [
            { load: 0.5, 's-max_avg_delta': 0.85, 's-sum_avg_delta': 0.88, 's-overlap_avg_delta': 0.84, 's-random_avg_delta': 0.62 },
            { load: 1.5, 's-max_avg_delta': 0.71, 's-sum_avg_delta': 0.75, 's-overlap_avg_delta': 0.68, 's-random_avg_delta': 0.48 },
            { load: 3.0, 's-max_avg_delta': 0.52, 's-sum_avg_delta': 0.55, 's-overlap_avg_delta': 0.46, 's-random_avg_delta': 0.31 },
          ],
        },
        created_at: new Date().toISOString(),
      };
    }
  },
};

export const analyticsApi = {
  getDashboard: async (): Promise<DashboardAnalytics> => {
    try {
      const res = await api.get('/analytics/dashboard');
      return res.data;
    } catch (e) {
      return {
        total_datasets: mockDatasets.length,
        total_agents: mockAgents.length,
        total_allocations: mockAllocations.length,
        active_investigations: mockInvestigations.length,
        detected_leaks: 1,
        highest_risk_agent: 'Agent U1 (Marketing Agency)',
        highest_risk_score: 0.87,
        average_guilt_probability: 0.47,
        agent_risk_comparison: mockAgents.map((a) => ({
          agent_id: a.id,
          agent_name: a.name,
          suspicion_score: a.suspicion_score,
          is_active: a.is_active,
        })),
        leakage_history: [
          { id: 1, date: new Date().toISOString().split('T')[0], matched_records: 21, unmatched_records: 4, fake_records: 1 },
        ],
        dataset_distribution: [
          { name: 'Demo Customer Master Dataset', records: 100 },
        ],
        allocation_overlap: [
          { allocation_id: 1, algorithm: 's-max', average_delta: 0.48, min_delta: 0.35 },
        ],
      };
    }
  },
};

export const demoApi = {
  init: async () => {
    try {
      const res = await api.post('/demo/init');
      return res.data;
    } catch (e) {
      return {
        message: "Demo data active client-side",
        dataset_id: 1,
        allocation_id: 1,
        investigation_id: 1,
        most_suspicious_agent_id: 1
      };
    }
  },
};

export default api;
