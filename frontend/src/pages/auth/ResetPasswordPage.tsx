import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/Button';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password criteria indicators
  const hasMinLength = password.length > 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const isFormValid = hasMinLength && hasUpper && hasLower && hasSpecial && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Reset token is missing or invalid. Please request a new password reset link.');
      return;
    }

    if (!isFormValid) {
      setErrorMessage('Please satisfy all password criteria and confirm password matches.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPassword({
        token,
        password,
        confirmPassword,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to reset password. The link may have expired or already been used.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token && !isSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center space-y-6 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white">Invalid Password Reset Link</h1>
          <p className="text-slate-400 text-sm">
            This reset link is missing a security token or has expired. Please submit a new request.
          </p>
          <Link to="/forgot-password" className="block pt-2">
            <Button variant="primary" className="w-full">
              Request New Reset Link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Set New Password</h1>
          <p className="text-slate-400 text-sm">
            Choose a strong password with letters, numbers and special characters.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start space-x-3 animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="space-y-6 text-center animate-fade-in">
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex flex-col items-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Password Updated!</h3>
              <p className="text-slate-300">
                Your new password has been secured and existing sessions have been invalidated.
              </p>
            </div>
            <Link to="/login" className="block">
              <Button variant="primary" className="w-full py-3">
                Sign In Now <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                New Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Confirm New Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Live Password Checklist */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <p className="font-semibold text-slate-300 mb-1">Required Criteria:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className={`flex items-center space-x-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>&gt; 8 characters</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasUpper ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>Uppercase letter</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasLower ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>Lowercase letter</span>
                </div>
                <div className={`flex items-center space-x-1.5 ${hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasSpecial ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>Special character</span>
                </div>
                <div className={`flex items-center space-x-1.5 col-span-2 ${passwordsMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>Passwords match</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={!isFormValid || isSubmitting}
              className="w-full py-3 text-base shadow-lg shadow-indigo-600/30"
            >
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
