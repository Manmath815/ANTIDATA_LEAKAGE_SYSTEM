import React, { useEffect, useState } from 'react';
import { GitFork, Play, Zap, Info, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { allocationApi, datasetApi } from '../services/api';
import { Dataset, Allocation, OverlapMatrix } from '../types';
import { OverlapHeatmap } from '../components/OverlapHeatmap';

const ALGORITHMS = [
  {
    id: 's-max',
    name: 's-max (Sample Requests - Minimized Max Overlap)',
    category: 'Sample',
    desc: 'Algorithm 4 + Algorithm 7. Minimizes maximum pairwise relative overlap among any pair of agents. Optimal worst-case attribution guarantee.',
  },
  {
    id: 's-sum',
    name: 's-sum (Sample Requests - Sum Objective)',
    category: 'Sample',
    desc: 'Section 7.2.3. Minimizes total relative overlap sum across agents, maximizing average detection confidence for agents with small sample requests.',
  },
  {
    id: 's-overlap',
    name: 's-overlap (Sample Requests - Sharing Count Min)',
    category: 'Sample',
    desc: 'Algorithm 4 + Algorithm 6. Allocates objects assigned to fewest agents (argmin a[k]). Yields disjoint sets when total request <= dataset size.',
  },
  {
    id: 's-random',
    name: 's-random (Sample Requests - Baseline Random)',
    category: 'Sample',
    desc: 'Algorithm 4 + Algorithm 5. Round-robin random allocation. Baseline control algorithm.',
  },
  {
    id: 'e-optimal',
    name: 'e-optimal (Explicit Requests - Greedy Fake Allocation)',
    category: 'Explicit',
    desc: 'Algorithm 1 + Algorithm 3. Greedily allocates fake objects to agents that maximize sum-objective improvement.',
  },
  {
    id: 'e-random',
    name: 'e-random (Explicit Requests - Random Fake Allocation)',
    category: 'Explicit',
    desc: 'Algorithm 1 + Algorithm 2. Randomly distributes fake objects to eligible agents up to budget B.',
  },
];

export const AllocationPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | ''>('');
  const [algorithm, setAlgorithm] = useState('s-max');
  const [allowFakeObjects, setAllowFakeObjects] = useState(true);
  const [fakeBudget, setFakeBudget] = useState(10);

  const [running, setRunning] = useState(false);
  const [activeAllocation, setActiveAllocation] = useState<Allocation | null>(null);
  const [matrixData, setMatrixData] = useState<OverlapMatrix | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    datasetApi.list().then((list) => {
      setDatasets(list);
      if (list.length > 0) setSelectedDatasetId(list[0].id);
    });
  }, []);

  const handleRunAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) return;

    setRunning(true);
    setError('');
    try {
      const alloc = await allocationApi.run({
        dataset_id: Number(selectedDatasetId),
        algorithm,
        allow_fake_objects: allowFakeObjects,
        fake_objects_budget: fakeBudget,
      });
      setActiveAllocation(alloc);
      const matrix = await allocationApi.getMatrix(alloc.id);
      setMatrixData(matrix);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Allocation execution failed. Ensure agents have configured requests for this dataset.');
    } finally {
      setRunning(false);
    }
  };

  const handleOptimize = async () => {
    if (!activeAllocation) return;
    setRunning(true);
    try {
      const optAlloc = await allocationApi.optimize(activeAllocation.id);
      setActiveAllocation(optAlloc);
      const matrix = await allocationApi.getMatrix(optAlloc.id);
      setMatrixData(matrix);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Optimization failed');
    } finally {
      setRunning(false);
    }
  };

  const selectedAlgoObj = ALGORITHMS.find((a) => a.id === algorithm);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Data Allocation Engine & Overlap Optimizer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Distribute master objects to third-party agents using paper allocation algorithms to maximize leaker attribution clarity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation Configuration Controls */}
        <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-slate-100">Allocation Strategy Configuration</h2>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleRunAllocation} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Select Master Dataset *
              </label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(Number(e.target.value))}
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
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
                Allocation Algorithm Strategy *
              </label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
              >
                {ALGORITHMS.map((algo) => (
                  <option key={algo.id} value={algo.id}>
                    [{algo.category}] {algo.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Algorithm Info Box */}
            {selectedAlgoObj && (
              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <span className="font-semibold text-sky-400 block">{selectedAlgoObj.name}</span>
                <p className="text-slate-400 leading-relaxed">{selectedAlgoObj.desc}</p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold">Enable Fake Objects Injection</span>
                <input
                  type="checkbox"
                  checked={allowFakeObjects}
                  onChange={(e) => setAllowFakeObjects(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-sky-500 focus:ring-0"
                />
              </div>

              {allowFakeObjects && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                    Total Distributor Fake Objects Budget (B)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={fakeBudget}
                    onChange={(e) => setFakeBudget(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={running || !selectedDatasetId}
              className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 mt-2"
            >
              {running ? (
                <span>Executing Algorithm...</span>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute Data Allocation</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results & Overlap Matrix */}
        <div className="lg:col-span-2 space-y-6">
          {activeAllocation && (
            <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-100">
                      Allocation Run Completed (#{activeAllocation.id})
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Algorithm: <span className="text-sky-400 font-bold">{activeAllocation.algorithm.toUpperCase()}</span> | Fake Objects Budget B: {activeAllocation.fake_objects_budget}
                  </p>
                </div>

                <button
                  onClick={handleOptimize}
                  disabled={running}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Optimize Overlap ({activeAllocation.algorithm.startsWith('e-') ? 'e-optimal' : 's-max'})</span>
                </button>
              </div>

              {/* Performance Metrics Badges */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Average Guilt Difference (Δ_bar)</span>
                  <span className="text-xl font-bold font-mono text-sky-400">
                    {activeAllocation.metrics?.average_delta ?? '0.0'}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">Higher Δ_bar means clearer leaker attribution on average</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Worst-case Difference (min Δ)</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {activeAllocation.metrics?.min_delta ?? '0.0'}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">Guarantee against indistinguishable leakers</p>
                </div>
              </div>
            </div>
          )}

          {matrixData ? (
            <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-100">
                Agent Pairwise Relative Overlap Heatmap (|Ri &cap; Rj| / min(mi, mj))
              </h3>
              <OverlapHeatmap matrixData={matrixData} />
            </div>
          ) : (
            <div className="bg-[#131B29] border border-slate-800 rounded-xl p-12 text-center text-xs text-slate-500">
              Select dataset and strategy, then click "Execute Data Allocation" to preview the distribution overlap matrix.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
