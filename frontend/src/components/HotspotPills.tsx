import React from 'react';
import { NavLink } from 'react-router-dom';

interface HotspotPillsProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

const PILLS = [
  { id: 'master', label: 'Distributor Master T', href: '/datasets' },
  { id: 'allocation', label: 'Allocation Engine', href: '/allocation' },
  { id: 'guilt', label: 'Guilt Model Pr(Gi|S)', href: '/investigate' },
  { id: 'overlap', label: 'Overlap Analysis', href: '/overlap' },
  { id: 'experiments', label: 'Research Benchmarks', href: '/experiments' },
];

export const HotspotPills: React.FC<HotspotPillsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex items-center justify-center flex-wrap gap-3 py-2">
      {PILLS.map((p) => {
        const isActive = activeTab === p.id;
        return (
          <NavLink
            key={p.id}
            to={p.href}
            onClick={() => onTabChange && onTabChange(p.id)}
            className={({ isActive: isLinkActive }) =>
              `px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all border ${
                isActive || isLinkActive
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-lg shadow-sky-500/20 scale-105'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-slate-100 hover:bg-slate-800'
              }`
            }
          >
            {p.label}
          </NavLink>
        );
      })}
    </div>
  );
};
