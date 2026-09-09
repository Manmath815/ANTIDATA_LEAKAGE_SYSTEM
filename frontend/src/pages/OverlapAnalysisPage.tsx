import React, { useEffect, useState } from 'react';
import { Grid, Info, ArrowDown, ShieldCheck, Zap } from 'lucide-react';
import { allocationApi } from '../services/api';
import { Allocation, OverlapMatrix } from '../types';
import { OverlapHeatmap } from '../components/OverlapHeatmap';

export const OverlapAnalysisPage: React.FC = () => {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [selectedAllocationId, setSelectedAllocationId] = useState<number | ''>('');
  const [matrixData, setMatrixData] = useState<OverlapMatrix | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    allocationApi.list().then((list) => {
      setAllocations(list);
      if (list.length > 0) {
        setSelectedAllocationId(list[0].id);
        allocationApi.getMatrix(list[0].id).then(setMatrixData);
      }
    });
  }, []);

  const handleSelectAllocation = async (id: number) => {
    setSelectedAllocationId(id);
    setLoading(true);
    try {
      const m = await allocationApi.getMatrix(id);
      setMatrixData(m);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Record Overlap & Attribution Clarity Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Analyze shared data record sets between third-party agents and evaluate objective optimization metrics.
          </p>
        </div>
      </div>

      {/* Concept Diagram Banner */}
      <div className="bg-[#131B29] border border-slate-800 rounded-xl p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-4">
          Core Research Optimization Principle
        </h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex-1">
            <span className="text-xs font-bold text-slate-200">Lower Unnecessary Overlap</span>
            <p className="text-[11px] text-slate-400 mt-1">Minimizing |Ri &cap; Rj| / min(mi, mj)</p>
          </div>

          <div className="text-sky-400 font-bold text-lg">&rarr;</div>

          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex-1">
            <span className="text-xs font-bold text-slate-200">Better Attribution</span>
            <p className="text-[11px] text-slate-400 mt-1">Maximizing average & worst-case Δ</p>
          </div>

          <div className="text-sky-400 font-bold text-lg">&rarr;</div>

          <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex-1">
            <span className="text-xs font-bold text-emerald-300">Higher Leaker Confidence</span>
            <p className="text-[11px] text-emerald-400/80 mt-1">Discerning leaker from innocent agents</p>
          </div>
        </div>
      </div>

      {/* Allocation Matrix Inspector */}
      <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">Select Allocation Session to Analyze</h3>
          </div>

          <div className="flex items-center gap-2">
            {allocations.map((alloc) => (
              <button
                key={alloc.id}
                onClick={() => handleSelectAllocation(alloc.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  selectedAllocationId === alloc.id
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                #{alloc.id} ({alloc.algorithm})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">Computing overlap matrix...</div>
        ) : matrixData ? (
          <OverlapHeatmap matrixData={matrixData} />
        ) : (
          <div className="py-12 text-center text-xs text-slate-500">No allocation data selected.</div>
        )}
      </div>
    </div>
  );
};
