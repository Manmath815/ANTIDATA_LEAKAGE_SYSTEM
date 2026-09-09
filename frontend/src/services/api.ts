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
});

// Set Auth Token Interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  getCurrentUser: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const datasetApi = {
  list: async (): Promise<Dataset[]> => {
    const res = await api.get('/datasets');
    return res.data;
  },
  get: async (id: number): Promise<Dataset> => {
    const res = await api.get(`/datasets/${id}`);
    return res.data;
  },
  getRecords: async (id: number, limit = 100, offset = 0): Promise<DataObject[]> => {
    const res = await api.get(`/datasets/${id}/records`, { params: { limit, offset } });
    return res.data;
  },
  upload: async (formData: FormData): Promise<Dataset> => {
    const res = await api.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  delete: async (id: number) => {
    await api.delete(`/datasets/${id}`);
  },
};

export const agentApi = {
  list: async (): Promise<Agent[]> => {
    const res = await api.get('/agents');
    return res.data;
  },
  create: async (data: { name: string; organization?: string; contact_email?: string }): Promise<Agent> => {
    const res = await api.post('/agents', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Agent>): Promise<Agent> => {
    const res = await api.put(`/agents/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    await api.delete(`/agents/${id}`);
  },
  getDetails: async (id: number) => {
    const res = await api.get(`/agents/${id}/details`);
    return res.data;
  },
  createRequest: async (data: {
    agent_id: number;
    dataset_id: number;
    request_type: 'EXPLICIT' | 'SAMPLE';
    sample_size?: number;
    conditions?: Record<string, any>;
    max_fake_objects?: number;
  }): Promise<AgentRequest> => {
    const res = await api.post('/agents/requests', data);
    return res.data;
  },
  getRequests: async (datasetId: number): Promise<AgentRequest[]> => {
    const res = await api.get(`/agents/requests/${datasetId}`);
    return res.data;
  },
};

export const allocationApi = {
  list: async (datasetId?: number): Promise<Allocation[]> => {
    const res = await api.get('/allocations', { params: { dataset_id: datasetId } });
    return res.data;
  },
  run: async (data: {
    dataset_id: number;
    algorithm: string;
    allow_fake_objects: boolean;
    fake_objects_budget: number;
  }): Promise<Allocation> => {
    const res = await api.post('/allocations', data);
    return res.data;
  },
  getMatrix: async (allocationId: number): Promise<OverlapMatrix> => {
    const res = await api.get(`/allocations/${allocationId}/matrix`);
    return res.data;
  },
  optimize: async (allocationId: number): Promise<Allocation> => {
    const res = await api.post(`/allocations/${allocationId}/optimize`);
    return res.data;
  },
};

export const leakApi = {
  listInvestigations: async (): Promise<Investigation[]> => {
    const res = await api.get('/leaks/investigations');
    return res.data;
  },
  investigate: async (data: {
    allocation_id: number;
    leaked_records: any[];
    title?: string;
    guessing_probability_p: number;
  }): Promise<Investigation> => {
    const res = await api.post('/leaks/investigate', data);
    return res.data;
  },
  getReportMarkdown: async (investigationId: number): Promise<string> => {
    const res = await api.get(`/leaks/investigations/${investigationId}/report`, {
      params: { format: 'markdown' },
    });
    return res.data;
  },
};

export const fakeRecordsApi = {
  generate: async (data: { dataset_id: number; count: number; conditions?: Record<string, any> }) => {
    const res = await api.post('/fake-records/generate', data);
    return res.data;
  },
  getForAllocation: async (allocationId: number) => {
    const res = await api.get(`/fake-records/allocation/${allocationId}`);
    return res.data;
  },
};

export const experimentApi = {
  list: async (): Promise<Experiment[]> => {
    const res = await api.get('/experiments');
    return res.data;
  },
  run: async (data: {
    name: string;
    guessing_probability_p: number;
    dataset_size: number;
    agent_count: number;
    sample_size_min: number;
    sample_size_max: number;
    fake_objects_budget: number;
    algorithms: string[];
  }): Promise<Experiment> => {
    const res = await api.post('/experiments/run', data);
    return res.data;
  },
};

export const analyticsApi = {
  getDashboard: async (): Promise<DashboardAnalytics> => {
    const res = await api.get('/analytics/dashboard');
    return res.data;
  },
};

export const demoApi = {
  init: async () => {
    const res = await api.post('/demo/init');
    return res.data;
  },
};

export default api;
