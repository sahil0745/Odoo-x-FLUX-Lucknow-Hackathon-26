import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Shield, Briefcase, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Return to intended location if redirected by ProtectedRoute
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await login({ email: loginEmail, password: loginPass });
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '';
      if (msg.includes('reach database') || msg.includes('connection refused') || msg.includes('500')) {
        setErrorMessage(
          'Database unreachable. Please start your PostgreSQL service (Win+R -> services.msc -> start postgresql-x64-18).'
        );
      } else {
        setErrorMessage(msg || 'Authentication failed. Please verify your email and password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please provide both your email address and password.');
      return;
    }
    await executeLogin(email, password);
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    executeLogin(demoEmail, demoPass);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
        {/* Header / Brand */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sign in to Brightloop</h1>
          <p className="text-slate-400 text-xs">
            Subscription Management & Recurring Revenue Engine
          </p>
        </div>

        {/* 1-Click Demo Accounts Quick Selector */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
          <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider text-center">
            ⚡ Quick 1-Click Demo Logins
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@brightloop.io', 'Brightloop@2026')}
              className="p-2 rounded-xl bg-slate-900 border border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/10 text-rose-300 text-xs font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <Shield className="w-4 h-4 text-rose-400" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('staff@brightloop.io', 'Brightloop@2026')}
              className="p-2 rounded-xl bg-slate-900 border border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10 text-amber-300 text-xs font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <Briefcase className="w-4 h-4 text-amber-400" />
              <span>Staff</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('customer@brightloop.io', 'Brightloop@2026')}
              className="p-2 rounded-xl bg-slate-900 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/10 text-indigo-300 text-xs font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <span>Customer</span>
            </button>
          </div>
          <div className="text-[10px] text-slate-500 text-center">
            Pre-seeded password: <span className="font-mono text-slate-400">Brightloop@2026</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start space-x-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@brightloop.io"
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-11 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="w-full py-2.5 text-sm font-bold shadow-lg shadow-indigo-600/30"
          >
            Sign In
          </Button>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-1 border-t border-slate-800/80">
          <p className="text-xs text-slate-400">
            Need a new account?{' '}
            <Link
              to="/register"
              className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
            >
              Register customer account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
