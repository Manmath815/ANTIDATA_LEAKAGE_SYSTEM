import React, { useEffect, useState } from 'react';
import { FileText, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { leakApi } from '../services/api';
import { Investigation } from '../types';

export const ReportPage: React.FC = () => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvId, setSelectedInvId] = useState<number | null>(null);
  const [markdownReport, setMarkdownReport] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leakApi.listInvestigations().then((list) => {
      setInvestigations(list);
      if (list.length > 0) {
        setSelectedInvId(list[0].id);
        leakApi.getReportMarkdown(list[0].id).then(setMarkdownReport);
      }
      setLoading(false);
    });
  }, []);

  const handleSelectInvestigation = async (id: number) => {
    setSelectedInvId(id);
    try {
      const md = await leakApi.getReportMarkdown(id);
      setMarkdownReport(md);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    if (!markdownReport || !selectedInvId) return;
    const blob = new Blob([markdownReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investigation_report_${selectedInvId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Investigation Attribution Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate and export formal research investigation reports with quantitative leaker probability disclaimers.
          </p>
        </div>

        {markdownReport && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-md shadow-sky-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Report (.md)</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Reports Sidebar */}
        <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Completed Audits</span>
          </h2>

          {loading ? (
            <div className="text-xs text-slate-500 font-mono py-4">Loading reports...</div>
          ) : investigations.length > 0 ? (
            <div className="space-y-2">
              {investigations.map((inv) => {
                const isSelected = selectedInvId === inv.id;
                return (
                  <button
                    key={inv.id}
                    onClick={() => handleSelectInvestigation(inv.id)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-sky-500/40 text-slate-100 font-bold'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>Report #{inv.id}</span>
                      <span className="font-mono text-[10px] text-sky-400">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-1">
                      Target: {inv.most_suspicious_agent || 'Unknown'}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-6 text-center">No reports generated yet.</div>
          )}
        </div>

        {/* Markdown Document Viewer */}
        <div className="lg:col-span-3 bg-[#131B29] border border-slate-800 rounded-xl p-6">
          {markdownReport ? (
            <div className="prose prose-invert max-w-none text-slate-300 text-xs leading-relaxed space-y-4 font-mono">
              <pre className="whitespace-pre-wrap font-mono bg-slate-900/80 p-6 rounded-xl border border-slate-800 text-slate-200 overflow-x-auto">
                {markdownReport}
              </pre>
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-slate-500">
              Select an investigation report from the sidebar to preview document content.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
