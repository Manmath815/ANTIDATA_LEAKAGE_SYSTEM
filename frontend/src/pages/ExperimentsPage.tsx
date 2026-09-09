import React, { useEffect, useState } from 'react';
import { FlaskConical, Play, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { experimentApi } from '../services/api';
import { Experiment } from '../types';

export const ExperimentsPage: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExp, setSelectedExp] = useState<Experiment | null>(null);
  const [running, setRunning] = useState(false);

  // Form parameters
  const [guessingP, setGuessingP] = useState(0.2);
  const [datasetSize, setDatasetSize] = useState(50);
  const [agentCount, setAgentCount] = useState(5);
  const [fakeBudget, setFakeBudget] = useState(10);

  const loadExperiments = async () => {
    try {
      const list = await experimentApi.list();
      setExperiments(list);
      if (list.length > 0 && !selectedExp) setSelectedExp(list[0]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadExperiments();
  }, []);

  const handleRunExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    try {
      const newExp = await experimentApi.run({
        name: `Simulation Run (p=${guessingP}, N=${agentCount}, |T|=${datasetSize})`,
        guessing_probability_p: guessingP,
        dataset_size: datasetSize,
        agent_count: agentCount,
        sample_size_min: 5,
        sample_size_max: 15,
        fake_objects_budget: fakeBudget,
        algorithms: ['s-random', 's-overlap', 's-sum', 's-max', 'e-optimal'],
      });
      setExperiments([newExp, ...experiments]);
      setSelectedExp(newExp);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to run experiment');
    } finally {
      setRunning(false);
    }
  };

  const pCurveData = selectedExp?.results?.p_guilt_curve || [];
  const loadCurveData = selectedExp?.results?.load_curve || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Research Paper Experiments & Simulations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Replicate key experimental benchmarks from Papadimitriou & Garcia-Molina (2011).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-slate-100">Run Simulation</h2>
          </div>

          <form onSubmit={handleRunExperiment} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Guessing Probability (p)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="0.95"
                value={guessingP}
                onChange={(e) => setGuessingP(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Distributor Dataset Size (|T|)
              </label>
              <input
                type="number"
                min="10"
                max="500"
                value={datasetSize}
                onChange={(e) => setDatasetSize(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Number of Agents (n)
              </label>
              <input
                type="number"
                min="2"
                max="30"
                value={agentCount}
                onChange={(e) => setAgentCount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Fake Objects Budget (B)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={fakeBudget}
                onChange={(e) => setFakeBudget(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={running}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
            >
              {running ? (
                <span>Simulating...</span>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute Simulation</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Experiment Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Figure 1a: Guilt Probability vs Guessing Probability p */}
          <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-100">
              Figure 1a Benchmark: Guilt Probability Pr(Gi | S) vs Guessing Probability p
            </h3>
            <p className="text-xs text-slate-400">
              Agent U1 has all 16 leaked objects; Agent U2 has 8 shared objects. As p increases, U2 guilt drops faster than U1.
            </p>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pCurveData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="p" label={{ value: 'Guessing Probability (p)', position: 'insideBottom', offset: -5, fill: '#94A3B8', fontSize: 11 }} stroke="#64748B" />
                  <YAxis domain={[0, 1.0]} label={{ value: 'Pr(Gi|S)', angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 11 }} stroke="#64748B" />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', color: '#F8FAFC' }} />
                  <Legend />
                  <Line type="monotone" dataKey="guilt_U1" name="Agent U1 (16/16 objects)" stroke="#38BDF8" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="guilt_U2" name="Agent U2 (8/16 shared)" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Figure 4a: Average Delta vs Load Ratio */}
          <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-100">
              Figure 4a Benchmark: Average Delta (Δ_bar) vs Dataset Load Ratio (SUM m_i / |T|)
            </h3>
            <p className="text-xs text-slate-400">
              Comparison of allocation strategies across increasing load ratios. s-max and s-sum maintain higher Delta_bar than s-random baseline.
            </p>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loadCurveData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="load" label={{ value: 'Load Ratio (SUM m_i / |T|)', position: 'insideBottom', offset: -5, fill: '#94A3B8', fontSize: 11 }} stroke="#64748B" />
                  <YAxis domain={[0, 1.0]} label={{ value: 'Average Delta', angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 11 }} stroke="#64748B" />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', color: '#F8FAFC' }} />
                  <Legend />
                  <Line type="monotone" dataKey="s-max_avg_delta" name="s-max" stroke="#38BDF8" strokeWidth={2} />
                  <Line type="monotone" dataKey="s-sum_avg_delta" name="s-sum" stroke="#10B981" strokeWidth={2} />
                  <Line type="monotone" dataKey="s-overlap_avg_delta" name="s-overlap" stroke="#F59E0B" strokeWidth={2} />
                  <Line type="monotone" dataKey="s-random_avg_delta" name="s-random (baseline)" stroke="#64748B" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
