import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { sprintVelocityData } from '../../services/mockData';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-slate-900 border border-slate-700/80 p-3 shadow-xl text-xs space-y-1">
        <p className="font-semibold text-slate-200">{label}</p>
        <div className="flex items-center gap-2 text-indigo-400">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>Committed: <strong>{payload[0]?.value} pts</strong></span>
        </div>
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Completed: <strong>{payload[1]?.value} pts</strong></span>
        </div>
      </div>
    );
  }
  return null;
};

export const VelocityChart = () => {
  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Sprint Velocity History
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Committed vs completed points over recent cycles
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-600" />
            <span className="text-slate-400">Committed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
            <span className="text-slate-300">Completed</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sprintVelocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="sprint"
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
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="committed" fill="#475569" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

