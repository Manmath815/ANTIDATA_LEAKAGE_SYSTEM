import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, Edit2, ShieldAlert, GitFork, CheckCircle, AlertCircle } from 'lucide-react';
import { agentApi, datasetApi } from '../services/api';
import { Agent, Dataset, AgentRequest } from '../types';

export const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentDetails, setAgentDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Agent Form
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Request Form
  const [reqDatasetId, setReqDatasetId] = useState<number | ''>('');
  const [reqType, setReqType] = useState<'EXPLICIT' | 'SAMPLE'>('SAMPLE');
  const [sampleSize, setSampleSize] = useState(30);
  const [conditionsJson, setConditionsJson] = useState('{"state": "CA"}');
  const [maxFakeObjects, setMaxFakeObjects] = useState(5);
  const [reqSuccess, setReqSuccess] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentList, dsList] = await Promise.all([agentApi.list(), datasetApi.list()]);
      setAgents(agentList);
      setDatasets(dsList);
      if (dsList.length > 0) setReqDatasetId(dsList[0].id);
      if (agentList.length > 0 && !selectedAgent) setSelectedAgent(agentList[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      agentApi.getDetails(selectedAgent.id).then(setAgentDetails).catch(console.error);
    }
  }, [selectedAgent]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      const newAgent = await agentApi.create({ name, organization, contact_email: contactEmail });
      setAgents([...agents, newAgent]);
      setSelectedAgent(newAgent);
      setName('');
      setOrganization('');
      setContactEmail('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create agent');
    }
  };

  const handleDeleteAgent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
      await agentApi.delete(id);
      const remaining = agents.filter((a) => a.id !== id);
      setAgents(remaining);
      if (selectedAgent?.id === id) setSelectedAgent(remaining[0] || null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !reqDatasetId) return;

    let conds = null;
    if (reqType === 'EXPLICIT' && conditionsJson) {
      try {
        conds = JSON.parse(conditionsJson);
      } catch (e) {
        alert('Invalid JSON filter condition');
        return;
      }
    }

    try {
      await agentApi.createRequest({
        agent_id: selectedAgent.id,
        dataset_id: Number(reqDatasetId),
        request_type: reqType,
        sample_size: reqType === 'SAMPLE' ? sampleSize : undefined,
        conditions: conds,
        max_fake_objects: maxFakeObjects,
      });
      setReqSuccess(true);
      setTimeout(() => setReqSuccess(false), 3000);
      agentApi.getDetails(selectedAgent.id).then(setAgentDetails);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save request');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Trusted Agents & Request Policies
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create third-party agent profiles, configure explicit filter or sample record requests, and monitor suspicion scores.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Agent Card */}
        <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-slate-100">Add Trusted Agent</h2>
          </div>

          <form onSubmit={handleCreateAgent} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Agent / Organization Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Agent U1 (Marketing)"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Organization
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Apex Marketing Inc."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="u1@apexmarket.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={!name}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-all disabled:opacity-50 mt-2"
            >
              Add Agent Profile
            </button>
          </form>
        </div>

        {/* Agents List */}
        <div className="lg:col-span-2 bg-[#131B29] border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-100 mb-4">Registered Agents List</h2>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">Loading agents...</div>
          ) : agents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {agents.map((agent) => {
                const isSelected = selectedAgent?.id === agent.id;
                const scorePct = (agent.suspicion_score * 100).toFixed(1);
                return (
                  <div
                    key={agent.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 border-sky-500/50 shadow-md shadow-sky-500/5'
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                    }`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100 truncate">{agent.name}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            agent.suspicion_score >= 0.7
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : agent.suspicion_score >= 0.3
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          Guilt: {scorePct}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{agent.organization || 'Independent'}</p>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
                      <span>ID: #{agent.id}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAgent(agent.id);
                        }}
                        className="text-slate-500 hover:text-rose-400"
                        title="Delete Agent"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              No agents created. Add an agent or run the one-click demo.
            </div>
          )}
        </div>
      </div>

      {/* Selected Agent Configuration & Requests */}
      {selectedAgent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configure Request */}
          <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <GitFork className="w-4 h-4 text-sky-400" />
                <span>Configure Request Policy for {selectedAgent.name}</span>
              </h3>
            </div>

            {reqSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Agent request policy saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveRequest} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                  Target Dataset *
                </label>
                <select
                  value={reqDatasetId}
                  onChange={(e) => setReqDatasetId(Number(e.target.value))}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {datasets.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name} ({ds.record_count} records)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                  Request Type *
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setReqType('SAMPLE')}
                    className={`py-2 px-3 rounded-lg border text-center font-semibold transition-all ${
                      reqType === 'SAMPLE'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    SAMPLE Request (m_i)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReqType('EXPLICIT')}
                    className={`py-2 px-3 rounded-lg border text-center font-semibold transition-all ${
                      reqType === 'EXPLICIT'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    EXPLICIT Request (cond_i)
                  </button>
                </div>
              </div>

              {reqType === 'SAMPLE' ? (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                    Requested Sample Size (m_i)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                    Explicit Filter Condition JSON (cond_i)
                  </label>
                  <textarea
                    value={conditionsJson}
                    onChange={(e) => setConditionsJson(e.target.value)}
                    rows={3}
                    className="w-full font-mono bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    placeholder='{"state": "CA"}'
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                  Max Fake Objects Allowed for Agent (b_i)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={maxFakeObjects}
                  onChange={(e) => setMaxFakeObjects(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-all"
              >
                Save Agent Request Configuration
              </button>
            </form>
          </div>

          {/* Agent Stats & Suspicion History */}
          <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">
              Agent Profile & Allocation Summary
            </h3>

            {agentDetails ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Allocated Records</span>
                    <span className="text-lg font-bold font-mono text-sky-400">{agentDetails.total_allocated_records}</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Injected Fake Records</span>
                    <span className="text-lg font-bold font-mono text-amber-400">{agentDetails.total_fake_records}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-300 mb-2">Active Request Policies</h4>
                  {agentDetails.requests.length > 0 ? (
                    <div className="space-y-2">
                      {agentDetails.requests.map((r: AgentRequest) => (
                        <div key={r.id} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 flex justify-between font-mono">
                          <div>
                            <span className="text-sky-400 font-bold">{r.request_type}</span>
                            {r.request_type === 'SAMPLE' ? (
                              <span className="text-slate-300 ml-2">Size: {r.sample_size}</span>
                            ) : (
                              <span className="text-slate-300 ml-2">Cond: {JSON.stringify(r.conditions)}</span>
                            )}
                          </div>
                          <span className="text-slate-400">b_i: {r.max_fake_objects}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No request policies configured yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs">Loading profile details...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
