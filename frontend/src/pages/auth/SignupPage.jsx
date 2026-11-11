import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { BrandLogo } from '../../components/common/BrandLogo';
import { Lock, Mail, User, Eye, EyeOff, AlertCircle, Link2, Sun, Moon } from 'lucide-react';

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
  const { theme, toggleTheme } = useUIStore();
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
      <div className="flex items-center justify-between gap-4">
        <BrandLogo size="md" />
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-subtle border border-transparent hover:border-line transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-ink-secondary" />
          ) : (
            <Moon className="w-4 h-4 text-ink-secondary" />
          )}
        </button>
      </div>

      <div className="my-auto py-8">
        <div className="rounded-xl bg-surface border border-line p-6 sm:p-7 shadow-card">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">
              Create your Flowdesk account
            </h1>
            <p className="text-sm text-ink-secondary mt-1.5">
              Register to create or join team workspaces and manage boards.
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-subtle px-3.5 py-2.5 text-xs text-danger"
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
      </div>

      <p className="text-xs text-ink-muted">
        Collaborative Project &amp; Team Workspace
      </p>
    </div>
  );
};
