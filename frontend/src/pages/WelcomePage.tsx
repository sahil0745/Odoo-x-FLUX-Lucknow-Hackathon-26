import React, { useEffect, useState } from 'react';
import {
  Server,
  Database,
  Code2,
  RefreshCw,
  Layers,
  Package,
  Calendar,
  Users,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { healthService } from '../services/healthService';
import { HealthResponse } from '../types';
import { useAuth } from '../context/AuthContext';

export const WelcomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await healthService.getHealth();
      setHealthData(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Backend server currently unreachable';
      setError(msg);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-8 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Modules M01, M02 & M03 Active · Odoo x FLUX Lucknow Hackathon
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Brightloop Subscription Management System
          </h1>
          <p className="mt-3 text-slate-300 text-base sm:text-lg leading-relaxed">
            Enterprise-grade, centralized recurring revenue platform automating product variant pricing,
            tiered subscription cadences, quotes, and automated lifecycle billing.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span>React 18 + TypeScript + Vite</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Node.js + Express + TypeScript</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Database className="w-4 h-4 text-violet-400" />
              <span>PostgreSQL + Prisma ORM</span>
            </div>
          </div>
        </div>

        {/* Decorative background blur */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Launchpad for Active Modules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Active Platform Modules
          </h2>
          <span className="text-xs text-slate-400">Ready for Live Operational Use</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Module 2: Products & Variants */}
          <Link
            to={isAuthenticated ? '/products' : '/login'}
            className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-indigo-500/5 block"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <Badge variant="info">M02</Badge>
            </div>
            <h3 className="text-base font-bold text-white mt-4 group-hover:text-indigo-300 transition-colors">
              Products & Additive Variants
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              Software catalog, services, cost/sales margin tracking, and additive brand variant pricing.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Access Catalog</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Module 3: Subscription Plans */}
          <Link
            to={isAuthenticated ? '/plans' : '/login'}
            className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-indigo-500/5 block"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <Badge variant="success">M03</Badge>
            </div>
            <h3 className="text-base font-bold text-white mt-4 group-hover:text-violet-300 transition-colors">
              Subscription Plans
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              Billing cadences (Daily, Weekly, Monthly, Yearly), auto-close flags, pause settings, and renewals.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-violet-400 group-hover:translate-x-1 transition-transform">
              <span>View Plans</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Module 1: Auth & Staff */}
          <Link
            to={isAuthenticated && user?.role === 'ADMIN' ? '/staff' : '/login'}
            className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-indigo-500/5 block"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <Badge variant="warning">M01</Badge>
            </div>
            <h3 className="text-base font-bold text-white mt-4 group-hover:text-amber-300 transition-colors">
              Identity & Staff Control
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              RBAC access control, HttpOnly token rotation, CSRF protection, and Admin-only staff provisioning.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>{user?.role === 'ADMIN' ? 'Manage Staff' : 'User Security'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>
        </div>
      </div>

      {/* Real-time Health Verification */}
      <div id="health" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" />
            System Runtime Health
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchHealth}
            disabled={loading}
            className="text-xs text-slate-300 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Backend API Service */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Server className="w-5 h-5" />
              </div>
              <Badge variant={healthData?.status === 'healthy' ? 'success' : 'danger'}>
                {healthData?.status ? healthData.status.toUpperCase() : 'CHECKING'}
              </Badge>
            </div>
            <div className="mt-4">
              <h3 className="text-base font-bold text-white">Express Backend API</h3>
              <p className="text-xs text-slate-400 mt-0.5">REST API Services & Middlewares</p>
              <div className="mt-4 space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">API Prefix:</span>
                  <span className="font-semibold text-slate-200">/api/v1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Environment:</span>
                  <span className="font-semibold text-slate-200">
                    {healthData?.environment || 'development'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Port:</span>
                  <span className="font-semibold text-slate-200">5000</span>
                </div>
              </div>
              {error && (
                <div className="mt-3 p-2 bg-rose-500/10 border border-rose-500/20 rounded text-[11px] text-rose-400">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Database Layer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
              <Badge variant={healthData?.database?.connected ? 'success' : 'neutral'}>
                {healthData?.database?.connected ? 'PostgreSQL Active' : 'Prisma Schema v1.1'}
              </Badge>
            </div>
            <div className="mt-4">
              <h3 className="text-base font-bold text-white">Database & ORM Layer</h3>
              <p className="text-xs text-slate-400 mt-0.5">PostgreSQL 16 + Prisma 5.x Client</p>
              <div className="mt-4 space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Prisma Client:</span>
                  <span className="font-semibold text-slate-200">25 Audited Models</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target RDBMS:</span>
                  <span className="font-semibold text-slate-200">PostgreSQL 16</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deduplication:</span>
                  <span className="font-semibold text-slate-200">
                    BillingCycleLog Unique Index
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {lastChecked && (
          <p className="text-[11px] text-slate-400 text-right">
            Last health ping: {lastChecked}
          </p>
        )}
      </div>

      {/* Module Traceability Matrix */}
      <div id="modules">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">Architecture Specification Matrix</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center text-xs">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold">
              <span className="font-bold block text-sm">M01</span>
              <span className="text-[11px]">Auth & Users</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold">
              <span className="font-bold block text-sm">M02</span>
              <span className="text-[11px]">Products & Variants</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold">
              <span className="font-bold block text-sm">M03</span>
              <span className="text-[11px]">Subscription Plans</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400">
              <span className="font-bold block text-sm">M04</span>
              <span className="text-[11px]">Quotations</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400">
              <span className="font-bold block text-sm">M05</span>
              <span className="text-[11px]">Subscriptions</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400">
              <span className="font-bold block text-sm">M06</span>
              <span className="text-[11px]">Automated Billing</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400">
              <span className="font-bold block text-sm">M07</span>
              <span className="text-[11px]">Discount Rules</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400">
              <span className="font-bold block text-sm">M08</span>
              <span className="text-[11px]">Payments</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400">
              <span className="font-bold block text-sm">M09</span>
              <span className="text-[11px]">Revenue Reporting</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400">
              <span className="font-bold block text-sm">M10</span>
              <span className="text-[11px]">Tax Engine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
