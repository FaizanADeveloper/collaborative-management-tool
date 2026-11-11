import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { BrandLogo } from '../../components/common/BrandLogo';
import { Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const nextFieldErrors = {};
    if (!email.trim()) nextFieldErrors.email = 'Email is required';
    if (!password) nextFieldErrors.password = 'Password is required';
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setLoading(true);
    const result = await login({ email, password });
    setLoading(false);

    if (result.success) {
      navigate(redirectPath, { replace: true });
    } else {
      setFormError(result.error || 'Unable to sign in. Please try again.');
      setFieldErrors(result.fieldErrors || {});
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex">
      {/* Form Column */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-16 max-w-lg mx-auto w-full">
        <BrandLogo size="md" />

        <div className="my-auto py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-ink tracking-tight">
              Sign in to Flowdesk
            </h1>
            <p className="text-sm text-ink-muted mt-1.5">
              Enter your account credentials to access your workspaces and boards.
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Email address"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
              }}
              placeholder="you@company.com"
              error={fieldErrors.email}
              autoComplete="email"
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                icon={Lock}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="Enter your password"
                error={fieldErrors.password}
                autoComplete="current-password"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-[30px] p-1 rounded text-ink-muted hover:text-ink transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Sign in
            </Button>
          </form>

          <p className="text-center text-xs text-ink-muted mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-brand font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        <p className="text-xs text-ink-muted">
          Collaborative Project &amp; Team Workspace
        </p>
      </div>

      {/* Overview Panel */}
      <div className="hidden lg:flex flex-1 bg-surface border-l border-line p-12 flex-col justify-center">
        <div className="max-w-md mx-auto space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-medium text-brand uppercase tracking-wider">
              Workspace Hierarchy
            </span>
            <h2 className="text-2xl font-bold text-ink tracking-tight leading-snug">
              Structured execution from workspace to individual cards.
            </h2>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Organize teams inside role-based workspaces, configure boards and lists to match your delivery cadence, and track every issue cleanly.
            </p>
          </div>

          <ul className="space-y-3 pt-2">
            {[
              'Role-based workspace membership & invite codes',
              'Dynamic boards, ordered lists, and card positioning',
              'Persistent drag-and-drop workflows backed by MongoDB Atlas',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-ink-secondary">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
