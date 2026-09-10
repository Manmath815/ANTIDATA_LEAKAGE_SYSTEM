import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Users,
  GitFork,
  ShieldAlert,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Search,
  Globe,
  BarChart3
} from 'lucide-react';
import { DashboardCard } from '../components/DashboardCard';
import { GuiltProbabilityChart } from '../components/GuiltProbabilityChart';
import { CyberGlobe3D } from '../components/CyberGlobe3D';
import { HotspotPills } from '../components/HotspotPills';
import { CyberLoader } from '../components/CyberLoader';
import { analyticsApi, leakApi } from '../services/api';
import { DashboardAnalytics, Investigation } from '../types';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'3D' | 'CHARTS'>('3D');
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const navigate = useNavigate();

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [analyticsData, invData] = await Promise.all([
        analyticsApi.getDashboard(),
        leakApi.listInvestigations(),
      ]);
      setData(analyticsData);
      setInvestigations(invData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const highestRiskScorePct = data?.highest_risk_score ? (data.highest_risk_score * 100).toFixed(1) : '0';

  const globeAgents = (data?.agent_risk_comparison || []).map((a) => ({
    id: a.agent_id,
    name: a.agent_name,
    suspicionScore: a.suspicion_score,
  }));

  return (
    <div className="space-y-6">
      {loading && <CyberLoader duration={1000} />}

      {/* Top Banner & Hotspot Pills */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
              <span>Data Leakage & Agent Attribution Console</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Interactive 3D network topology, quantitative risk assessment, and mathematical leaker attribution.
            </p>
          </div>
          <button
            onClick={loadDashboard}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <HotspotPills />
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Datasets"
          value={data?.total_datasets || 0}
          subtitle="Managed master data sets"
          icon={Database}
          color="sky"
        />
        <DashboardCard
          title="Trusted Agents"
          value={data?.total_agents || 0}
          subtitle="Active third-party recipients"
          icon={Users}
          color="emerald"
        />
        <DashboardCard
          title="Data Allocations"
          value={data?.total_allocations || 0}
          subtitle="Executed allocation strategies"
          icon={GitFork}
          color="purple"
        />
        <DashboardCard
          title="Active Investigations"
          value={data?.active_investigations || 0}
          subtitle="Detected breach drops"
          icon={ShieldAlert}
          color="rose"
        />
      </div>

      {/* 3D Network Visualization & Risk Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Highest Risk Summary */}
        <div className="lg:col-span-1 bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Highest-Risk Agent
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>

          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <div className="text-sm font-bold text-rose-300">
              {data?.highest_risk_agent || 'None Identified'}
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs text-rose-400/80">Guilt Probability:</span>
              <span className="text-xl font-extrabold font-mono text-rose-400">
                {highestRiskScorePct}%
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Average Guilt Score:</span>
              <span className="font-mono font-semibold text-slate-200">
                {((data?.average_guilt_probability || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Detected Leak Incidents:</span>
              <span className="font-mono font-semibold text-amber-400">
                {data?.detected_leaks || 0}
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/investigate')}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Launch New Leak Investigation</span>
          </button>
        </div>

        {/* 3D Globe View vs Bar Chart Toggle */}
        <div className="lg:col-span-2 bg-[#131B29] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Data Network Topology & Risk Profile
              </h3>
              <p className="text-xs text-slate-400">
                {viewMode === '3D' ? 'Interactive 3D WebGL data distribution graph' : 'Guilt probability bar chart'}
              </p>
            </div>

            <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 gap-1">
              <button
                onClick={() => setViewMode('3D')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                  viewMode === '3D' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>3D View</span>
              </button>
              <button
                onClick={() => setViewMode('CHARTS')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                  viewMode === 'CHARTS' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>2D Chart</span>
              </button>
            </div>
          </div>

          {viewMode === '3D' ? (
            <CyberGlobe3D
              agents={globeAgents.length > 0 ? globeAgents : undefined}
              selectedAgentId={selectedAgentId}
              onSelectAgent={(id) => setSelectedAgentId(id)}
              height="340px"
            />
          ) : (
            <div className="pt-4">
              <GuiltProbabilityChart
                scores={(data?.agent_risk_comparison || []).map((a) => ({
                  agent_id: a.agent_id,
                  agent_name: a.agent_name,
                  guilt_probability: a.suspicion_score,
                  matched_object_count: 0,
                  fake_object_count: 0,
                }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Recent Breach Investigations */}
      <div className="bg-[#131B29] border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-100">
            Recent Breach Investigations
          </h3>
          <button
            onClick={() => navigate('/reports')}
            className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-medium"
          >
            <span>View All Reports</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {investigations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-900/60 uppercase font-mono text-[10px] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Inv ID</th>
                  <th className="p-3">Matched Records</th>
                  <th className="p-3">Fake Records Found</th>
                  <th className="p-3">Most Suspicious Agent</th>
                  <th className="p-3">Max Guilt Prob</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {investigations.slice(0, 5).map((inv) => {
                  const topScore = inv.guilt_scores?.[0]?.guilt_probability || 0;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/30">
                      <td className="p-3 text-sky-400 font-bold">#{inv.id}</td>
                      <td className="p-3">{inv.matched_records_count}</td>
                      <td className="p-3">
                        {inv.fake_records_found_count > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                            ⚠️ {inv.fake_records_found_count} Fake Record(s)
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-100 font-sans">
                        {inv.most_suspicious_agent || 'Unknown'}
                      </td>
                      <td className="p-3 font-bold text-amber-400">
                        {(topScore * 100).toFixed(1)}%
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-500">
            No investigations performed yet. Click "Run One-Click Demo" at the top to simulate a leak!
          </div>
        )}
      </div>
    </div>
  );
};
