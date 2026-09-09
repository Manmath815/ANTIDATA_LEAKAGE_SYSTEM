import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { GuiltScore } from '../types';

interface GuiltProbabilityChartProps {
  scores: GuiltScore[];
}

export const GuiltProbabilityChart: React.FC<GuiltProbabilityChartProps> = ({ scores }) => {
  const chartData = scores.map((s) => ({
    name: s.agent_name,
    probability: round(s.guilt_probability * 100, 1),
    realRecords: s.matched_object_count - s.fake_object_count,
    fakeRecords: s.fake_object_count,
  }));

  const getBarColor = (val: number) => {
    if (val >= 80) return '#EF4444'; // Rose
    if (val >= 50) return '#F59E0B'; // Amber
    if (val >= 25) return '#38BDF8'; // Sky
    return '#10B981'; // Emerald
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#64748B"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            stroke="#64748B"
            domain={[0, 100]}
            unit="%"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              borderColor: '#1E293B',
              borderRadius: '0.5rem',
              color: '#F8FAFC',
              fontSize: '12px',
            }}
            formatter={(val: number) => [`${val}%`, 'Guilt Probability']}
          />
          <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.probability)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

function round(val: number, precision: number) {
  const factor = Math.pow(10, precision);
  return Math.round(val * factor) / factor;
}
