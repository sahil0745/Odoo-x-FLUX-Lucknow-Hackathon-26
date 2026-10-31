import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Building,
  RefreshCw,
  FileText,
  Eye,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { customerService } from '../services/customerService';
import { CustomerProfile, CustomerDetail } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form states
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('US');
  const password = 'Brightloop@2026';

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const list = await customerService.getCustomers();
      setCustomers(list);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);
    try {
      await customerService.createCustomer({
        email: email.trim().toLowerCase(),
        contactName: contactName.trim(),
        companyName: companyName.trim() || undefined,
        phone: phone.trim() || undefined,
        billingAddress: billingAddress.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        password,
      });
      setIsCreateOpen(false);
      setContactName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      fetchCustomers();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewCustomer = async (id: string) => {
    setIsDetailOpen(true);
    setLoadingDetail(true);
    try {
      const detail = await customerService.getCustomerById(id);
      setSelectedCustomer(detail);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to load customer details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const s = searchTerm.toLowerCase();
    return (
      c.contactName?.toLowerCase().includes(s) ||
      c.companyName?.toLowerCase().includes(s) ||
      c.city?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage client profiles, company billing credentials, and active subscription portfolios.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Provision Customer
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by contact, company, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {filteredCustomers.length} {filteredCustomers.length === 1 ? 'Customer' : 'Customers'}
        </div>
      </div>

      {/* Customers Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">Loading customer accounts...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No customers found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            {searchTerm ? 'No results matched your search query.' : 'Click "Provision Customer" to register an account.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Customer / Company</th>
                  <th className="py-3.5 px-6">Contact Name</th>
                  <th className="py-3.5 px-6">Location</th>
                  <th className="py-3.5 px-6">Phone</th>
                  <th className="py-3.5 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span>{cust.companyName || cust.contactName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800">{cust.contactName}</td>
                    <td className="py-4 px-6 text-slate-600">
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{cust.city || 'N/A'}{cust.country ? `, ${cust.country}` : ''}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 text-xs">{cust.phone || '—'}</td>
                    <td className="py-4 px-6 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCustomer(cust.id)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        360° View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Provision Customer */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Provision Customer Account"
        description="Creates a Customer login and links a CustomerProfile record."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Name</label>
              <input
                type="text"
                required
                placeholder="Jane Doe"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Name</label>
              <input
                type="text"
                placeholder="Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone</label>
              <input
                type="text"
                placeholder="+1-555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Billing Address</label>
            <input
              type="text"
              placeholder="123 Corporate Blvd"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">City</label>
              <input
                type="text"
                placeholder="New York"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Country</label>
              <input
                type="text"
                placeholder="US"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Provision Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Customer 360° View */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Customer 360°: ${selectedCustomer?.contactName || 'Profile'}`}
        description="Comprehensive portfolio of active subscriptions, quotes, and billing history."
        maxWidth="2xl"
      >
        {loadingDetail ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <Spinner size="lg" />
            <p className="text-xs text-slate-500">Aggregating customer history...</p>
          </div>
        ) : selectedCustomer ? (
          <div className="space-y-5">
            {/* Contact details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Company</span>
                <span className="font-bold text-slate-800">{selectedCustomer.companyName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Email</span>
                <span className="font-bold text-slate-800">{selectedCustomer.user?.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Phone</span>
                <span className="font-bold text-slate-800">{selectedCustomer.phone || '—'}</span>
              </div>
            </div>

            {/* Subscriptions */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Active Subscriptions ({selectedCustomer.subscriptions?.length || 0})
              </h4>
              {(!selectedCustomer.subscriptions || selectedCustomer.subscriptions.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No subscriptions registered.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                  {selectedCustomer.subscriptions.map((s) => (
                    <div key={s.id} className="p-3 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">{s.subscriptionNumber}</div>
                        <div className="text-[11px] text-slate-400">Next billing: {new Date(s.nextBillingDate).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">${Number(s.totalAmount).toFixed(2)}</div>
                        <Badge variant={s.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                          {s.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" /> Invoices ({selectedCustomer.invoices?.length || 0})
              </h4>
              {(!selectedCustomer.invoices || selectedCustomer.invoices.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No invoices issued.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                  {selectedCustomer.invoices.map((inv) => (
                    <div key={inv.id} className="p-3 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">{inv.invoiceNumber}</div>
                        <div className="text-[11px] text-slate-400">Due: {new Date(inv.dueDate).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">${Number(inv.grandTotal).toFixed(2)}</div>
                        <Badge variant={inv.status === 'PAID' ? 'success' : 'info'} size="sm">
                          {inv.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
