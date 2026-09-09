import React from 'react';
import { OverlapMatrix } from '../types';

interface OverlapHeatmapProps {
  matrixData: OverlapMatrix;
}

export const OverlapHeatmap: React.FC<OverlapHeatmapProps> = ({ matrixData }) => {
  const { agents, matrix, relative_overlap_matrix, average_delta, min_delta } = matrixData;

  const getHeatmapColor = (val: number, isDiagonal: boolean) => {
    if (isDiagonal) return 'bg-slate-800 text-slate-400 font-bold';
    if (val <= 0.2) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (val <= 0.5) return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    if (val <= 0.75) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-rose-500/30 text-rose-300 border-rose-500/40 font-bold';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
        <div>
          <span className="text-slate-400">Average Delta (Δ_bar): </span>
          <span className="font-mono text-sky-400 font-semibold">{average_delta}</span>
        </div>
        <div>
          <span className="text-slate-400">Worst-case Delta (min Δ): </span>
          <span className="font-mono text-emerald-400 font-semibold">{min_delta}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Legend:</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300">Low Overlap (&le;0.2)</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/20 text-amber-300">Med (&le;0.75)</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-rose-500/30 text-rose-300">High (&gt;0.75)</span>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-800 rounded-lg">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800">
              <th className="p-3 font-semibold text-slate-400 border-r border-slate-800">Agent</th>
              {agents.map((name, idx) => (
                <th key={idx} className="p-3 font-semibold text-slate-300 text-center min-w-[100px]">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map((rowAgent, rIdx) => (
              <tr key={rIdx} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                <td className="p-3 font-medium text-slate-200 bg-slate-900/50 border-r border-slate-800">
                  {rowAgent}
                </td>
                {agents.map((_, cIdx) => {
                  const isDiag = rIdx === cIdx;
                  const absCount = matrix[rIdx]?.[cIdx] ?? 0;
                  const relVal = relative_overlap_matrix[rIdx]?.[cIdx] ?? 0;
                  return (
                    <td key={cIdx} className="p-2 text-center">
                      <div
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${getHeatmapColor(
                          relVal,
                          isDiag
                        )}`}
                      >
                        <span className="font-mono text-xs">{isDiag ? '100%' : `${(relVal * 100).toFixed(0)}%`}</span>
                        <span className="text-[10px] opacity-75 font-mono">({absCount} records)</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
