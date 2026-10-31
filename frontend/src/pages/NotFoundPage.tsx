import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">404 - Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary" size="md" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Status Page</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
