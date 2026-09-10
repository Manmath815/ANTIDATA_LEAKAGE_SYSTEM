import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface CyberLoaderProps {
  onComplete?: () => void;
  duration?: number;
}

export const CyberLoader: React.FC<CyberLoaderProps> = ({ onComplete, duration = 1200 }) => {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHidden(true);
      if (onComplete) onComplete();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (hidden) return null;

  return (
    <div className="fixed inset-0 bg-[#0B0F17] z-[300] flex flex-col items-center justify-center gap-6 transition-opacity duration-700">
      <div className="relative flex items-center justify-center">
        <div className="w-20 h-20 bg-sky-500/10 rounded-full border border-sky-500/30 animate-ping absolute"></div>
        <div className="w-16 h-16 bg-[#131B29] border border-sky-500/40 rounded-2xl flex items-center justify-center text-sky-400 shadow-xl shadow-sky-500/20 z-10">
          <ShieldCheck className="w-8 h-8 animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="font-mono font-bold text-xs tracking-widest uppercase text-slate-200">
          DATA LEAKAGE ATTRIBUTION PLATFORM
        </span>
        <span className="text-[10px] font-mono text-sky-400 opacity-80 uppercase tracking-widest">
          INITIALIZING 3D GRAPH & ALGORITHMS
        </span>
      </div>

      <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full animate-pulse w-full"></div>
      </div>
    </div>
  );
};
