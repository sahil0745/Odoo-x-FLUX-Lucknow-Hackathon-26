import React, { useState } from 'react';
import {
  Layers,
  Menu,
  X,
  LogOut,
  LogIn,
  UserPlus,
  Shield,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  const isLinkActive = (path: string) => {
    return location.pathname === path;
  };

  const linkClass = (path: string) =>
    `transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
      isLinkActive(path)
        ? 'bg-slate-800 text-indigo-400'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  const mobileLinkClass = (path: string) =>
    `block px-3 py-2 rounded-lg text-sm font-semibold ${
      isLinkActive(path)
        ? 'bg-slate-800 text-indigo-400'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-lg">Brightloop</span>
                <span className="text-[10px] uppercase font-semibold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30 tracking-wide">
                  SaaS
                </span>
              </div>
              <p className="text-xs text-slate-400 -mt-0.5">Subscription Management</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className={linkClass('/dashboard')}>
                  Dashboard
                </Link>

                {isAdminOrStaff && (
                  <>
                    <Link to="/customers" className={linkClass('/customers')}>
                      Customers
                    </Link>
                    <Link to="/products" className={linkClass('/products')}>
                      Products
                    </Link>
                  </>
                )}

                <Link to="/plans" className={linkClass('/plans')}>
                  Plans
                </Link>
                <Link to="/quotations" className={linkClass('/quotations')}>
                  Quotations
                </Link>
                <Link to="/subscriptions" className={linkClass('/subscriptions')}>
                  Subscriptions
                </Link>
                <Link to="/invoices" className={linkClass('/invoices')}>
                  Invoices
                </Link>
                <Link to="/payments" className={linkClass('/payments')}>
                  Payments
                </Link>

                {isAdminOrStaff && (
                  <Link to="/taxes-discounts" className={linkClass('/taxes-discounts')}>
                    Taxes/Promos
                  </Link>
                )}

                {user?.role === 'ADMIN' && (
                  <Link to="/staff" className={linkClass('/staff')}>
                    Staff
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to="/products" className={linkClass('/products')}>
                  Products & Pricing
                </Link>
                <Link to="/plans" className={linkClass('/plans')}>
                  Subscription Plans
                </Link>
              </>
            )}
          </nav>

          {/* User Account Controls */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
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
          <div className="flex lg:hidden">
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
          <div className="lg:hidden py-4 border-t border-slate-800 space-y-2">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass('/dashboard')}>
                  Dashboard
                </Link>
                {isAdminOrStaff && (
                  <>
                    <Link to="/customers" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass('/customers')}>
                      Customers
                    </Link>
                    <Link to="/products" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass('/products')}>
                      Products & Variants
                    </Link>
                  </>
                )}
                <Link to="/plans" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass('/plans')}>
                  Plans
                </Link>
                <Link to="/quotations" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass('/quotations')}>
                  Quotations
                </Link>
                <Link to="/subscriptions" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass('/subscriptions')}>
                  Subscriptions
                </Link>
                <Link to="/invoices" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass('/invoices')}>
                  Invoices
                </Link>
                <Link to="/payments" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass('/payments')}>
                  Payments
                </Link>
                {isAdminOrStaff && (
                  <Link to="/taxes-discounts" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass('/taxes-discounts')}>
                    Taxes & Discounts
                  </Link>
                )}
                {user?.role === 'ADMIN' && (
                  <Link to="/staff" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass('/staff')}>
                    Staff Management
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass('/')}>
                  Home
                </Link>
                <Link to="/products" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass('/products')}>
                  Products & Pricing
                </Link>
                <Link to="/plans" onClick={() => setMobileMenuOpen(false)} className={mobileLinkClass('/plans')}>
                  Subscription Plans
                </Link>
              </>
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
