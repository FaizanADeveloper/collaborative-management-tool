import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Zap, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/30">
            <Zap className="w-4 h-4" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">SyncFlow</span>
        </div>

        {submitted ? (
          <div className="text-center py-4 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Reset link sent!</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              If an account exists for <strong className="text-slate-200">{email}</strong>, we have sent instructions to reset your password.
            </p>
            <div className="pt-4">
              <Link to="/login">
                <Button variant="secondary" size="md" className="w-full" icon={ArrowLeft}>
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Reset your password</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your work email address and we'll send you a password recovery link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Work Email"
                type="email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
              />

              <Button type="submit" variant="primary" size="md" className="w-full">
                Send Reset Link
              </Button>
            </form>

            <div className="pt-2 text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to login</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

