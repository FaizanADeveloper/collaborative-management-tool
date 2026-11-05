import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { sprintBurndownData } from '../../services/mockData';
import { TrendingDown, Info } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-slate-900 border border-slate-700/80 p-3 shadow-xl text-xs space-y-1">
        <p className="font-semibold text-slate-200">{label}</p>
        <div className="flex items-center gap-2 text-indigo-400">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>Actual Remaining: <strong>{payload[0]?.value ?? 'N/A'} pts</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          <span>Guideline Burn: <strong>{payload[1]?.value} pts</strong></span>
        </div>
      </div>
    );
  }
  return null;
};

export const BurndownChart = () => {
  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100">
              Sprint 24 Burndown Curve
            </h3>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
              Ahead of Pace
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Ideal trajectory vs actual points remaining
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-slate-300">Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-slate-500" />
            <span className="text-slate-400">Ideal Guideline</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sprintBurndownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              domain={[0, 50]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#0f172a' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
            <Line
              type="linear"
              dataKey="ideal"
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

