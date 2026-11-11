import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendDirection = 'up', // 'up' | 'down'
  color = 'indigo',
}) => {
  const colorMaps = {
    indigo: {
      bg: 'bg-indigo-950/40',
      border: 'border-indigo-800/40',
      text: 'text-indigo-400',
      gradient: 'from-indigo-600/20 to-transparent',
    },
    emerald: {
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-800/40',
      text: 'text-emerald-400',
      gradient: 'from-emerald-600/20 to-transparent',
    },
    amber: {
      bg: 'bg-amber-950/40',
      border: 'border-amber-800/40',
      text: 'text-amber-400',
      gradient: 'from-amber-600/20 to-transparent',
    },
    sky: {
      bg: 'bg-sky-950/40',
      border: 'border-sky-800/40',
      text: 'text-sky-400',
      gradient: 'from-sky-600/20 to-transparent',
    },
    rose: {
      bg: 'bg-rose-950/40',
      border: 'border-rose-800/40',
      text: 'text-rose-400',
      gradient: 'from-rose-600/20 to-transparent',
    }
  };

  const scheme = colorMaps[color] || colorMaps.indigo;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-900/70 border ${scheme.border} p-5 shadow-sm transition-all hover:scale-[1.01]`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${scheme.gradient} rounded-full blur-2xl pointer-events-none -mr-10 -mt-10`} />

      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {title}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {value}
            </span>
            {trend && (
              <span
                className={`inline-flex items-center text-xs font-semibold ${
                  trendDirection === 'up' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {trendDirection === 'up' ? (
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                )}
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-xl ${scheme.bg} ${scheme.text} border ${scheme.border}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};

