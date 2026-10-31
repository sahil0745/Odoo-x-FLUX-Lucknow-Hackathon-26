import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Lock,
  Mail,
  Building,
  Briefcase,
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

interface StaffMember {
  id: string;
  email: string;
  role: 'STAFF';
  isActive: boolean;
  createdAt: string;
  staffProfile?: {
    id: string;
    department: string | null;
    title: string | null;
    createdAt: string;
    createdBy?: {
      id: string;
      email: string;
    } | null;
  } | null;
}

export const StaffManagementPage: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New staff modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [title, setTitle] = useState('Staff Specialist');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStaff = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.get('/staff');
      const sData = res.data.data;
      setStaffList(Array.isArray(sData) ? sData : (sData?.items || []));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load staff accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await apiClient.post('/staff', {
        email,
        password,
        department,
        title,
      });

      setSuccessMessage(`Staff account ${res.data.data.email} provisioned successfully!`);
      setIsModalOpen(false);
      setEmail('');
      setPassword('');
      fetchStaff();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create staff account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staffId: string, currentStatus: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await apiClient.patch(`/staff/${staffId}/status`, {
        isActive: !currentStatus,
      });
      setSuccessMessage(`Staff status updated successfully.`);
      fetchStaff();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update staff status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Internal Staff Directory</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Admin Only
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Provision, inspect, and manage role-restricted staff operational accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={fetchStaff} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" /> Provision Staff
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Staff Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <Spinner size="lg" className="mx-auto text-indigo-500" />
            <p className="text-slate-400 text-sm font-medium">Loading staff accounts...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">No internal staff found</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                No internal staff accounts have been provisioned yet. Use the button above to create one.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1.5" /> Provision First Staff Member
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Account Email</th>
                  <th className="px-6 py-4">Role & Status</th>
                  <th className="px-6 py-4">Department / Title</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{staff.email}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {staff.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          STAFF
                        </span>
                        {staff.isActive ? (
                          <Badge variant="success" size="sm">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="sm">
                            Deactivated
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-200">
                        {staff.staffProfile?.department || 'Operations'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {staff.staffProfile?.title || 'Staff Member'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(staff.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(staff.id, staff.isActive)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                          staff.isActive
                            ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                            : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                      >
                        {staff.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Provision Staff Account</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Staff Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff.name@brightloop.io"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Initial Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 9 chars, 1 upper, 1 lower, 1 special"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Must contain &gt;8 chars, uppercase, lowercase, and a symbol.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Sales, Support, Billing..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Job Title
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Operations Associate"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-1/2"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-1/2"
                  isLoading={isSubmitting}
                >
                  Provision
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
