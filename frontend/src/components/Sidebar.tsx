import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Users,
  GitFork,
  ShieldAlert,
  Grid,
  FlaskConical,
  FileText,
  ShieldCheck
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Datasets', href: '/datasets', icon: Database },
  { name: 'Agents', href: '/agents', icon: Users },
  { name: 'Data Allocation', href: '/allocation', icon: GitFork },
  { name: 'Investigate Leak', href: '/investigate', icon: ShieldAlert },
  { name: 'Overlap Analysis', href: '/overlap', icon: Grid },
  { name: 'Research Experiments', href: '/experiments', icon: FlaskConical },
  { name: 'Reports', href: '/reports', icon: FileText },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col justify-between shrink-0">
      <div>
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="p-2 bg-sky-500/10 rounded-lg border border-sky-500/20 text-sky-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 tracking-tight leading-none">
              DATA LEAKAGE
            </h1>
            <p className="text-[10px] text-sky-400 font-mono tracking-wider mt-1">
              ATTRIBUTION PLATFORM
            </p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm shadow-sky-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800/80">
        <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Model Engine</span>
            <span className="font-mono text-sky-400 text-[10px] bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
              TKDE 2011
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Papadimitriou & Garcia-Molina
          </p>
        </div>
      </div>
    </aside>
  );
};
