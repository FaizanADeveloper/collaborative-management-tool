import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Zap, Lock, Mail, User, CheckCircle2 } from 'lucide-react';

export const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuthStore();
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!name || !email) return;
    setLoading(true);
    await signup(name, email, password);
    setLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex text-slate-100">
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/30">
            <Zap className="w-4 h-4" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">SyncFlow</span>
        </div>

        <div className="my-auto py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Create your free workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Start collaborating in real-time with your engineering team today.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              icon={User}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Lee"
              required
              autoFocus
            />

            <Input
              label="Work Email"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan@company.com"
              required
            />

            <Input
              label="Create Password"
              type="password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full shadow-lg shadow-indigo-600/25"
            >
              Get Started with SyncFlow
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <div className="text-xs text-slate-500 flex items-center justify-between">
          <span>&copy; 2026 SyncFlow Inc.</span>
          <span className="font-mono text-[11px] text-emerald-400">SOC2 Type II Certified</span>
        </div>
      </div>
    </div>
  );
};

