import React from 'react';
import { Play, LogOut, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { demoApi } from '../services/api';

interface NavbarProps {
  onDemoInit?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onDemoInit }) => {
  const { user, logout } = useAuth();
  const [loadingDemo, setLoadingDemo] = React.useState(false);
  const [demoDone, setDemoDone] = React.useState(false);

  const handleRunDemo = async () => {
    setLoadingDemo(true);
    try {
      await demoApi.init();
      setDemoDone(true);
      if (onDemoInit) onDemoInit();
      setTimeout(() => setDemoDone(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <header className="h-16 bg-[#0F172A]/80 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          System Active
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleRunDemo}
          disabled={loadingDemo}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-sky-500/20 transition-all disabled:opacity-50"
        >
          {loadingDemo ? (
            <span className="animate-spin text-white">⚙️</span>
          ) : demoDone ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{demoDone ? 'Demo Initialized!' : 'Run One-Click Demo'}</span>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-slate-800 rounded-lg text-slate-400">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-left text-xs">
            <p className="font-medium text-slate-200">{user?.name || 'Distributor Admin'}</p>
            <p className="text-slate-400 text-[11px] font-mono">{user?.email || 'admin@distributor.org'}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-1"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
