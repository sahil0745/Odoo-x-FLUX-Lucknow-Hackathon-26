import React, { useState } from 'react';
import { Layers, Menu, X, Shield, Activity, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-lg">Brightloop</span>
                <span className="text-[10px] uppercase font-semibold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded tracking-wide">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 -mt-0.5">Subscription Management</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-brand-600 transition-colors flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-brand-500" />
              <span>System Status</span>
            </Link>
            <a
              href="#architecture"
              className="hover:text-brand-600 transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Architecture</span>
            </a>
            <a
              href="#modules"
              className="hover:text-brand-600 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Module Matrix</span>
            </a>
          </nav>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-100 space-y-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              System Status
            </Link>
            <a
              href="#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Architecture Reference
            </a>
            <a
              href="#modules"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Module Matrix
            </a>
          </div>
        )}
      </div>
    </header>
  );
};
