import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export const TaskDistributionChart = () => {
  const { tasks } = useWorkspaceStore();

  const counts = {
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    in_review: tasks.filter(t => t.status === 'in_review').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const data = [
    { name: 'To Do', value: counts.todo, color: '#94a3b8' },
    { name: 'In Progress', value: counts.in_progress, color: '#6366f1' },
    { name: 'In Review', value: counts.in_review, color: '#f59e0b' },
    { name: 'Completed', value: counts.completed, color: '#10b981' },
  ];

  const total = tasks.length || 1;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const pct = Math.round((item.value / total) * 100);
      return (
        <div className="rounded-lg bg-slate-900 border border-slate-700 p-2 shadow-xl text-xs space-y-0.5">
          <p className="font-semibold text-slate-200">{item.name}</p>
          <p className="text-slate-400">
            {item.value} tasks ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-semibold text-slate-100">
          Status Distribution
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Breakdown of all active workspace issues
        </p>
      </div>

      <div className="h-44 w-full relative my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={50}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-white font-mono">{tasks.length}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-slate-300 truncate">{item.name}</span>
            </div>
            <span className="font-mono text-slate-400 font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

