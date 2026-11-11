import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Zap, Lock, Mail, User, Eye, EyeOff, AlertCircle, Link2 } from 'lucide-react';

export const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const { register } = useAuthStore();
  const navigate = useNavigate();

  const validateClientFields = () => {
    const errors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (trimmedName.length > 50) {
      errors.name = 'Name cannot exceed 50 characters';
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please provide a valid email address';
    }

    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one number';
    }

    if (avatar.trim()) {
      try {
        new URL(avatar.trim());
      } catch {
        errors.avatar = 'Avatar must be a valid URL';
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const clientErrors = validateClientFields();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    const result = await register({ name, email, password, avatar });
    setLoading(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setFormError(result.error || 'Registration failed. Please check your details.');
      setFieldErrors(result.fieldErrors || {});
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between p-6 sm:p-10 max-w-lg mx-auto w-full">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center">
          <Zap className="w-4 h-4" aria-hidden="true" />
        </div>
        <span className="font-semibold text-lg tracking-tight text-ink">SyncFlow</span>
      </div>

      <div className="my-auto py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Create your account
          </h1>
          <p className="text-sm text-ink-muted mt-1.5">
            Register to create or join team workspaces and manage boards.
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
            label="Full name *"
            type="text"
            icon={User}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="Alex Morgan"
            error={fieldErrors.name}
            autoComplete="name"
            required
          />

          <Input
            label="Email address *"
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
              label="Password *"
              type={showPassword ? 'text' : 'password'}
              icon={Lock}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
              }}
              placeholder="Minimum 8 chars, 1 uppercase & 1 number"
              helperText="Must be at least 8 characters with an uppercase letter and a number."
              error={fieldErrors.password}
              autoComplete="new-password"
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

          <Input
            label="Avatar URL (optional)"
            type="url"
            icon={Link2}
            value={avatar}
            onChange={(e) => {
              setAvatar(e.target.value);
              if (fieldErrors.avatar) setFieldErrors((prev) => ({ ...prev, avatar: '' }));
            }}
            placeholder="https://example.com/avatar.png"
            error={fieldErrors.avatar}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
          >
            Create account
          </Button>
        </form>

        <p className="text-center text-xs text-ink-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-xs text-ink-muted">
        Collaborative Agile Workspace
      </p>
    </div>
  );
};
