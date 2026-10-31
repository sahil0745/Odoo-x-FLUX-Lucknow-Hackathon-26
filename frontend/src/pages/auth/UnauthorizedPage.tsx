import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Access Restricted</h1>
          <p className="text-slate-400 text-sm">
            Your current account role (
            <span className="font-semibold text-rose-400 uppercase tracking-wider text-xs px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800">
              {user?.role || 'GUEST'}
            </span>
            ) does not have permission to view or manage this resource.
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 text-left space-y-1">
          <p className="font-semibold text-slate-300">Why am I seeing this?</p>
          <p>
            Brightloop enforces strict Role-Based Access Control (RBAC). If you believe you require access,
            please contact your system administrator.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full">
              <Home className="w-4 h-4 mr-2" /> Return to Dashboard
            </Button>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-slate-700 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
};
