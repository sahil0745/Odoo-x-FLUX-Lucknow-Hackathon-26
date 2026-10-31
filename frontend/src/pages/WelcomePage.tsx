import React, { useEffect, useState } from 'react';
import {
  Server,
  Database,
  Code2,
  RefreshCw,
  Layers,
  Cpu,
  FileText,
  Calendar,
  Package,
  CreditCard,
  LayoutDashboard,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { healthService } from '../services/healthService';
import { HealthResponse } from '../types';

export const WelcomePage: React.FC = () => {
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
            Recurring Billing & Payment Engine Active · Brightloop v1.3
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Subscription Management System
          </h1>
          <p className="mt-3 text-slate-300 text-base sm:text-lg leading-relaxed">
            Centralized platform for Brightloop Software to automate customer subscriptions,
            recurring billing cycles, tax-rules, invoices, payments, and real-time revenue analytics.
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
              <Database className="w-4 h-4 text-indigo-400" />
              <span>PostgreSQL + Prisma ORM</span>
            </div>
          </div>
        </div>

        {/* Decorative background blur */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Module Quick Launch Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-3">
          Platform Capabilities & Active Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Executive Dashboard */}
          <Link
            to="/dashboard"
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <Badge variant="info">M12</Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3 group-hover:text-indigo-400 transition-colors">
              Executive Dashboard
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              MRR metrics, active subscriptions, revenue collections & overdue receivables.
            </p>
            <div className="mt-3 flex items-center text-xs font-semibold text-indigo-500">
              <span>View Business KPIs</span> <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Invoices & Billing */}
          <Link
            to="/invoices"
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <Badge variant="info">M06</Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3 group-hover:text-blue-400 transition-colors">
              Invoices & Billing
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Automated recurring invoice generation with guaranteed deduplication.
            </p>
            <div className="mt-3 flex items-center text-xs font-semibold text-blue-500">
              <span>Run Billing Engine</span> <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Payments & Allocations */}
          <Link
            to="/payments"
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <Badge variant="success">M08</Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3 group-hover:text-emerald-400 transition-colors">
              Payment Management
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Record payments, multi-invoice allocations, and settle outstanding balances.
            </p>
            <div className="mt-3 flex items-center text-xs font-semibold text-emerald-500">
              <span>Manage Payments</span> <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Subscriptions */}
          <Link
            to="/subscriptions"
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <Badge variant="success">M05</Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3 group-hover:text-purple-400 transition-colors">
              Subscriptions
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Contract agreements, renewals, pause/resume, and schedule advances.
            </p>
            <div className="mt-3 flex items-center text-xs font-semibold text-purple-500">
              <span>Manage Contracts</span> <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Subscription Plans */}
          <Link
            to="/plans"
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <Badge variant="warning">M03</Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3 group-hover:text-amber-400 transition-colors">
              Subscription Plans
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Daily, Weekly, Monthly, and Yearly recurring pricing cadences.
            </p>
            <div className="mt-3 flex items-center text-xs font-semibold text-amber-500">
              <span>Configure Plans</span> <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Products Catalog */}
          <Link
            to="/products"
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-violet-500/50 shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <Badge variant="info">M02</Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3 group-hover:text-violet-400 transition-colors">
              Products & Variants
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Software products and additive variant surcharges.
            </p>
            <div className="mt-3 flex items-center text-xs font-semibold text-violet-500">
              <span>View Catalog</span> <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Customer Portal */}
          <Link
            to="/portal"
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 shadow-sm transition-all group sm:col-span-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <Badge variant="success">M13</Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3 group-hover:text-teal-400 transition-colors">
              Customer Self-Service Portal
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Customers securely view their own contracts, itemized invoices, receipts, and outstanding balance.
            </p>
            <div className="mt-3 flex items-center text-xs font-semibold text-teal-500">
              <span>Open Customer Portal</span> <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>
        </div>
      </div>

      {/* Live System Status Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Development Environment Status</h2>
            <p className="text-xs text-slate-500">Live operational status across all system tiers</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealth}
            isLoading={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Status</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Frontend Tier Card */}
          <Card className="hover:border-brand-200 transition-all">
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600">
                <Cpu className="w-5 h-5" />
              </div>
              <Badge variant="success">Operational</Badge>
            </div>
            <div className="mt-4">
              <h3 className="text-base font-semibold text-slate-900">Frontend Client</h3>
              <p className="text-xs text-slate-500 mt-0.5">Vite Single Page Application</p>
              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Framework:</span>
                  <span className="font-medium text-slate-700">React 18 (TypeScript)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Styling:</span>
                  <span className="font-medium text-slate-700">Tailwind CSS 3.4</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Port:</span>
                  <span className="font-medium text-slate-700">5173</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Backend Tier Card */}
          <Card className="hover:border-emerald-200 transition-all">
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <Server className="w-5 h-5" />
              </div>
              {healthData ? (
                <Badge variant="success">API Online (200 OK)</Badge>
              ) : (
                <Badge variant="warning">{loading ? 'Checking...' : 'Unreachable'}</Badge>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-base font-semibold text-slate-900">Backend API</h3>
              <p className="text-xs text-slate-500 mt-0.5">Express.js REST Engine</p>
              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Health Endpoint:</span>
                  <span className="font-medium text-slate-700">/api/v1/health</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Environment:</span>
                  <span className="font-medium text-slate-700">{healthData?.environment || 'development'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Port:</span>
                  <span className="font-medium text-slate-700">5000</span>
                </div>
              </div>
              {error && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
                  {error}
                </div>
              )}
            </div>
          </Card>

          {/* Database Tier Card */}
          <Card className="hover:border-indigo-200 transition-all">
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <Database className="w-5 h-5" />
              </div>
              {healthData?.database.connected ? (
                <Badge variant="success">PostgreSQL Connected</Badge>
              ) : (
                <Badge variant="neutral">Prisma Configured</Badge>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-base font-semibold text-slate-900">Database Layer</h3>
              <p className="text-xs text-slate-500 mt-0.5">PostgreSQL + Prisma ORM</p>
              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">ORM Provider:</span>
                  <span className="font-medium text-slate-700">Prisma Client 5.x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target RDBMS:</span>
                  <span className="font-medium text-slate-700">PostgreSQL 16</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Schema Phase:</span>
                  <span className="font-medium text-slate-700">Audited v1.1 Active</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {lastChecked && (
          <p className="text-[11px] text-slate-400 mt-2 text-right">
            Last health ping: {lastChecked}
          </p>
        )}
      </div>

      {/* Architecture Matrix */}
      <div id="modules">
        <Card header={<h3 className="font-semibold text-slate-900 text-sm">Scope & Architecture Traceability Matrix</h3>}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block">M01</span>
              <span className="text-slate-500 text-[11px]">Auth & Users</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block">M02</span>
              <span className="text-slate-500 text-[11px]">Products & Variants</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block">M03</span>
              <span className="text-slate-500 text-[11px]">Subscription Plans</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block">M05</span>
              <span className="text-slate-500 text-[11px]">Subscriptions</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block">M06</span>
              <span className="text-slate-500 text-[11px]">Automated Billing</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block">M08</span>
              <span className="text-slate-500 text-[11px]">Payments & Allocation</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block">M10</span>
              <span className="text-slate-500 text-[11px]">Tax Engine</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block">M12</span>
              <span className="text-slate-500 text-[11px]">Dashboard & MRR</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block">M13</span>
              <span className="text-slate-500 text-[11px]">Customer Portal</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block">M14</span>
              <span className="text-slate-500 text-[11px]">Security & Audit</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
