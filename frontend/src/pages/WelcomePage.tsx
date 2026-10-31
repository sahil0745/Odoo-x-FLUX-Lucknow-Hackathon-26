import React, { useEffect, useState } from 'react';
import {
  Server,
  Database,
  Code2,
  CheckCircle2,
  RefreshCw,
  Layers,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
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
      const msg = err && typeof err === 'object' && 'message' in err 
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
      <div className="bg-gradient-to-r from-slate-900 via-brand-900 to-slate-900 text-white rounded-2xl p-8 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Environment Initialized · Sprint 1 / Master Prompt 02
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
              <Code2 className="w-4 h-4 text-brand-400" />
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
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Live System Status Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Development Environment Status</h2>
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
                  <span className="font-medium text-slate-700">Scheduled for Prompt 03</span>
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

      {/* Architecture & Implementation Roadmap */}
      <div id="architecture" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Foundation Checklist */}
        <Card header={<h3 className="font-semibold text-slate-900 text-sm">Initialization Deliverables Completed</h3>}>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium text-slate-800">TypeScript Strict Mode & Linters</span>
                <p className="text-xs text-slate-500">Configured with compiler checks across both frontend and backend.</p>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium text-slate-800">CORS & Security Middleware</span>
                <p className="text-xs text-slate-500">Explicit allowed origins with JSON limiters and sanitized error responses.</p>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium text-slate-800">Prisma Client & PostgreSQL Datasource</span>
                <p className="text-xs text-slate-500">Prisma generator ready for schema migration in Master Prompt 03.</p>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium text-slate-800">Centralized Error & 404 Handlers</span>
                <p className="text-xs text-slate-500">Structured typed exceptions with stack-trace masking in production.</p>
              </div>
            </li>
          </ul>
        </Card>

        {/* Master Prompt 03 Roadmap */}
        <Card header={<h3 className="font-semibold text-slate-900 text-sm">Next Phase: Master Prompt 03</h3>}>
          <div className="space-y-3 text-sm text-slate-600">
            <p className="text-xs text-slate-500 leading-relaxed">
              Upon approval of this initialization stage, Master Prompt 03 will implement the complete database schema:
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <Layers className="w-4 h-4 text-brand-600" />
                <span>17 Relational Entities & State Machines</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Users & Roles (Admin, Staff, Customer), Products & Additive Variants, Plans & Lifecycle Config, Quotations, Subscriptions, Invoices, Tax Rules, Discounts, Payments, and Billing Cycle Deduplication Logs.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-brand-700 font-medium pt-1">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <span>Strict Scope Enforced: No business logic or fake data created ahead of phase.</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Module Matrix Summary */}
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
              <span className="font-bold text-slate-800 block">M04</span>
              <span className="text-slate-500 text-[11px]">Quotations</span>
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
              <span className="font-bold text-slate-800 block">M07</span>
              <span className="text-slate-500 text-[11px]">Discount Rules</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block">M08</span>
              <span className="text-slate-500 text-[11px]">Payments</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block">M09</span>
              <span className="text-slate-500 text-[11px]">Revenue Reporting</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block">M10</span>
              <span className="text-slate-500 text-[11px]">Tax Engine</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
