import React, { useState, useEffect } from 'react';
import {
  History,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { invoiceService } from '../../services/invoiceService';
import { BillingCycleLog, BillingRunStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

export const BillingLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<BillingCycleLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invoiceService.listBillingLogs();
      setLogs(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load billing cycle logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getStatusBadgeVariant = (status: BillingRunStatus) => {
    switch (status) {
      case 'GENERATED':
        return 'success';
      case 'SKIPPED':
        return 'info';
      case 'FAILED':
        return 'danger';
      case 'PENDING':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white mb-2 self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Invoices</span>
          </Button>
          <div className="flex items-center gap-2">
            <History className="w-7 h-7 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Recurring Billing Execution Audit
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Complete database-level audit history verifying zero duplicate invoicing and execution retry tracking.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit</span>
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <Spinner className="w-8 h-8 text-indigo-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-200">No billing cycles recorded yet</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Once recurring billing runs are triggered, all execution logs and deduplication checks will be recorded here.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Processed At</th>
                  <th className="py-3.5 px-4 font-semibold">Subscription #</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Billing Period</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Retries</th>
                  <th className="py-3.5 px-4 font-semibold">Notes / Diagnostics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                      {new Date(log.processedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {log.subscription?.subscriptionNumber || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="text-slate-200 font-medium">
                        {log.subscription?.customer?.companyName || log.subscription?.customer?.contactName}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(log.billingPeriodStart).toLocaleDateString()} -{' '}
                      {new Date(log.billingPeriodEnd).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={getStatusBadgeVariant(log.status)}>
                        {log.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold">
                      {log.invoice ? (
                        <Link
                          to={`/invoices/${log.invoice.id}`}
                          className="text-indigo-400 hover:text-indigo-300 underline"
                        >
                          {log.invoice.invoiceNumber}
                        </Link>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs font-mono">
                      {log.retryCount > 0 ? (
                        <span className="text-rose-400 font-bold">{log.retryCount}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {log.errorMessage ? (
                        <span className="text-rose-400 font-medium">{log.errorMessage}</span>
                      ) : log.status === 'SKIPPED' ? (
                        <span className="text-indigo-300">Deduplicated: already billed</span>
                      ) : (
                        <span className="text-emerald-400">Completed successfully</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
