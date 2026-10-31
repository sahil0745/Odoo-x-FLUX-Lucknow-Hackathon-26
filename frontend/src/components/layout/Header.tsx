import React, { useState } from 'react';
import {
  Layers,
  Menu,
  X,
  Users,
  Package,
  Calendar,
  FileText,
  LogOut,
  LogIn,
  UserPlus,
  Shield,
  Briefcase,
  UserCheck,
  CreditCard,
  LayoutDashboard,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = () => {
    if (!user) return null;
    switch (user.role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Shield className="w-3 h-3" /> ADMIN
          </span>
        );
      case 'STAFF':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Briefcase className="w-3 h-3" /> STAFF
          </span>
        );
      case 'CUSTOMER':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <UserCheck className="w-3 h-3" /> CUSTOMER
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-lg">Brightloop</span>
                <span className="text-[10px] uppercase font-semibold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30 tracking-wide">
                  v1.3
                </span>
              </div>
              <p className="text-xs text-slate-400 -mt-0.5">Subscription Management</p>
            </div>
          </Link>

          {/* Desktop Role-Aware Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            {isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'STAFF') && (
              <Link to="/dashboard" className="hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                <span>Dashboard</span>
              </Link>
            )}

            {isAuthenticated && user?.role === 'CUSTOMER' && (
              <Link to="/portal" className="hover:text-indigo-400 transition-colors flex items-center gap-1.5 text-indigo-300 font-semibold">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <span>Customer Portal</span>
              </Link>
            )}

            {isAuthenticated && (
              <>
                <Link
                  to="/products"
                  className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                >
                  <Package className="w-4 h-4 text-indigo-400" />
                  <span>Products</span>
                </Link>
                <Link
                  to="/plans"
                  className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Plans</span>
                </Link>
                <Link
                  to="/subscriptions"
                  className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                >
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Subscriptions</span>
                </Link>
                <Link
                  to="/invoices"
                  className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Invoices</span>
                </Link>
                <Link
                  to="/payments"
                  className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span>Payments</span>
                </Link>
              </>
            )}

            {/* Admin Specific Links */}
            {user?.role === 'ADMIN' && (
              <Link
                to="/staff"
                className="hover:text-indigo-400 transition-colors flex items-center gap-1.5 text-indigo-300 font-semibold"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Staff Management</span>
              </Link>
            )}
          </nav>

          {/* User Account Controls */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-200">
                    {user.customerProfile?.contactName || user.email}
                  </div>
                  <div className="flex items-center justify-end mt-0.5">{getRoleBadge()}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out of account"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                    <LogIn className="w-4 h-4 mr-1.5" /> Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    <UserPlus className="w-4 h-4 mr-1.5" /> Register
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800 space-y-3">
            {isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'STAFF') && (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                <span>Executive Dashboard</span>
              </Link>
            )}

            {isAuthenticated && user?.role === 'CUSTOMER' && (
              <Link
                to="/portal"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-indigo-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <span>Customer Portal</span>
              </Link>
            )}

            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-300 hover:bg-slate-800"
            >
              Overview & Roadmap
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  to="/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Package className="w-4 h-4 text-indigo-400" />
                  <span>Products</span>
                </Link>
                <Link
                  to="/plans"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Subscription Plans</span>
                </Link>
                <Link
                  to="/subscriptions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Subscriptions</span>
                </Link>
                <Link
                  to="/invoices"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Invoices & Billing</span>
                </Link>
                <Link
                  to="/payments"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span>Payments</span>
                </Link>
              </>
            )}
            {user?.role === 'ADMIN' && (
              <Link
                to="/staff"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-indigo-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Staff Management</span>
              </Link>
            )}

            <div className="pt-3 border-t border-slate-800">
              {isAuthenticated && user ? (
                <div className="space-y-3 px-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300 truncate">{user.email}</span>
                    {getRoleBadge()}
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-1.5" /> Sign Out
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 px-3">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="secondary" size="sm" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full">
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
