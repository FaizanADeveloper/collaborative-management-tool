import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { initialUsers } from '../../services/mockData';
import { Zap, ShieldCheck, ArrowRight, Lock, Mail, Sparkles, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('alex.morgan@syncflow.io');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
    navigate('/dashboard');
  };

  const handleQuickDemoFill = (user) => {
    setEmail(user.email);
    setPassword('demoPass123');
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex text-slate-100">
      {/* Left Form Area */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto w-full">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/30">
            <Zap className="w-4 h-4" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">SyncFlow</span>
        </div>

        {/* Center Card */}
        <div className="my-auto py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sign in to your workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Access real-time sprint boards, velocity metrics, and team presence.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Work Email"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300">
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full shadow-lg shadow-indigo-600/25"
            >
              Sign In to SyncFlow
            </Button>
          </form>

          {/* Quick Demo Accounts Helper */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Instant Demo Fill
              </span>
              <span className="text-[10px] text-indigo-400 font-mono">One-click signin</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {initialUsers.slice(0, 3).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickDemoFill(u)}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-800 text-left transition-all group"
                >
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 truncate">
                    {u.name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{u.role.split(' ')[0]}</p>
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-400 font-semibold hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-500 flex items-center justify-between">
          <span>&copy; 2026 SyncFlow Inc.</span>
          <span className="font-mono text-[11px] text-emerald-400">● Socket.io Operational</span>
        </div>
      </div>

      {/* Right Visual Showcase Panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-950 via-slate-900 to-[#070b12] border-l border-slate-800/80 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex justify-end">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            v2.4 Agile Engine
          </span>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              Real-time agile workspace built for high-velocity teams.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Designed with the speed of Linear, the structure of Jira, and the flexibility of Trello.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              'Sub-20ms optimistic drag-and-drop state syncing',
              'Real-time teammate presence & live card focus rings',
              'Automated sprint burndown velocity charts'
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          <p className="italic text-slate-300">
            &ldquo;SyncFlow cut our sprint planning meetings in half. The real-time board updates are instantaneous.&rdquo;
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-semibold text-white">Alex Morgan</span>
            <span>— Lead Systems Architect</span>
          </div>
        </div>
      </div>
    </div>
  );
};

