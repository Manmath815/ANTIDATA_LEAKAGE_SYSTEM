import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, Upload, Search, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import { allocationApi, leakApi } from '../services/api';
import { Allocation, Investigation } from '../types';
import { GuiltProbabilityChart } from '../components/GuiltProbabilityChart';

export const LeakInvestigationPage: React.FC = () => {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [selectedAllocationId, setSelectedAllocationId] = useState<number | ''>('');
  const [guessingP, setGuessingP] = useState(0.2);
  const [leakTitle, setLeakTitle] = useState('Discovered Dark Web Data Drop');
  
  // Input method: PASTE vs FILE
  const [inputMethod, setInputMethod] = useState<'PASTE' | 'FILE'>('PASTE');
  const [rawText, setRawText] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [investigating, setInvestigating] = useState(false);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    allocationApi.list().then((list) => {
      setAllocations(list);
      if (list.length > 0) setSelectedAllocationId(list[0].id);
    });
  }, []);

  const handleInvestigate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocationId) return;

    let records: any[] = [];
    if (inputMethod === 'PASTE') {
      if (!rawText.trim()) {
        setError('Please paste leaked record JSON or text');
        return;
      }
      try {
        records = JSON.parse(rawText);
        if (!Array.isArray(records)) records = [records];
      } catch (err) {
        setError('Invalid JSON payload. Please paste a valid array of object records.');
        return;
      }
    } else {
      if (!file) {
        setError('Please select a leaked CSV or JSON file');
        return;
      }
      const text = await file.text();
      try {
        records = JSON.parse(text);
      } catch (e) {
        setError('Could not parse leaked file');
        return;
      }
    }

    setInvestigating(true);
    setError('');
    try {
      const result = await leakApi.investigate({
        allocation_id: Number(selectedAllocationId),
        leaked_records: records,
        title: leakTitle,
        guessing_probability_p: guessingP,
      });
      setInvestigation(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Investigation failed');
    } finally {
      setInvestigating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Leak Investigation & Leaker Attribution Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Compare discovered leaked objects against agent allocation sets and calculate guilt probabilities Pr(Gi | S).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Investigation Controls */}
        <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold text-slate-100">Investigate Breach</h2>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleInvestigate} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Select Allocation Session *
              </label>
              <select
                value={selectedAllocationId}
                onChange={(e) => setSelectedAllocationId(Number(e.target.value))}
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
              >
                {allocations.map((a) => (
                  <option key={a.id} value={a.id}>
                    Allocation #{a.id} - Dataset #{a.dataset_id} ({a.algorithm.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Investigation Title
              </label>
              <input
                type="text"
                value={leakTitle}
                onChange={(e) => setLeakTitle(e.target.value)}
                placeholder="Discovered Dark Web Data Drop"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-400 font-semibold uppercase tracking-wider">
                  Target Guessing Probability (p)
                </label>
                <span className="font-mono text-sky-400 font-bold">{guessingP}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.9"
                step="0.05"
                value={guessingP}
                onChange={(e) => setGuessingP(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Likelihood that an object can be gathered independently without agent leaks.
              </p>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Leaked Records Input Method
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setInputMethod('PASTE')}
                  className={`py-1.5 px-3 rounded-lg border text-center font-semibold transition-all ${
                    inputMethod === 'PASTE'
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  Paste Records JSON
                </button>
                <button
                  type="button"
                  onClick={() => setInputMethod('FILE')}
                  className={`py-1.5 px-3 rounded-lg border text-center font-semibold transition-all ${
                    inputMethod === 'FILE'
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {inputMethod === 'PASTE' ? (
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                  Paste Leaked Objects JSON Array
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={5}
                  placeholder='[{"email": "customer1@example.com"}, ...]'
                  className="w-full font-mono bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-[11px] focus:outline-none focus:border-sky-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                  Select Leaked JSON File
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-slate-400 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-sky-400"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={investigating || !selectedAllocationId}
              className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white font-bold rounded-lg shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 mt-2"
            >
              {investigating ? (
                <span>Matching Records & Calculating...</span>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Execute Leak Investigation</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Investigation Results & Attribution Ranking */}
        <div className="lg:col-span-2 space-y-6">
          {investigation ? (
            <div className="space-y-6">
              {/* Fake Record High-Priority Alert Banner */}
              {investigation.fake_records_found_count > 0 && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-200">
                      CRITICAL EVIDENCE: Fake Record Identified in Leaked Set!
                    </h4>
                    <p className="text-xs text-rose-300/80 mt-0.5">
                      The distributor's secret fake object (watermark record) was discovered in the leaked data. Because fake records are exclusive to specific recipient agents, this provides high-confidence probabilistic evidence.
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Investigation Summary #{investigation.id}</span>
                  </h3>
                  <button
                    onClick={() => navigate('/reports')}
                    className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Export Full Report</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Matched Records</span>
                    <span className="text-xl font-bold font-mono text-sky-400">{investigation.matched_records_count}</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Unmatched Records</span>
                    <span className="text-xl font-bold font-mono text-slate-400">{investigation.unmatched_records_count}</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Fake Records Found</span>
                    <span className="text-xl font-bold font-mono text-rose-400">{investigation.fake_records_found_count}</span>
                  </div>
                </div>

                {/* Most Suspicious Source */}
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400">Most Likely Leaker Source:</span>
                    <h4 className="text-lg font-bold text-slate-100 mt-0.5">
                      {investigation.most_suspicious_agent || 'Unknown'}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Top Guilt Score:</span>
                    <div className="text-2xl font-extrabold font-mono text-rose-400">
                      {((investigation.guilt_scores?.[0]?.guilt_probability || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Guilt Probabilities Chart */}
              <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-100 mb-4">
                  Agent Guilt Probability Distribution Pr(Gi | S)
                </h3>
                <GuiltProbabilityChart scores={investigation.guilt_scores} />
              </div>

              {/* Legal Disclaimer */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300">Methodology & Legal Note:</span>
                <p className="text-[11px] leading-relaxed">
                  {investigation.summary_report?.disclaimer}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#131B29] border border-slate-800 rounded-xl p-12 text-center text-xs text-slate-500">
              Select allocation session and paste leaked records to perform leaker attribution analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
