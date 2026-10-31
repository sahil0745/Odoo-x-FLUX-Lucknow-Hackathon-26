import { Prisma, SubscriptionStatus, InvoiceStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AuthUser } from '../../types';

export class DashboardService {
  async getDashboardMetrics(user: AuthUser) {
    const isCustomer = user.role === 'CUSTOMER';
    const customerId = user.customerProfileId;

    const invoiceFilter: Prisma.InvoiceWhereInput = isCustomer && customerId ? { customerId } : {};
    const subFilter: Prisma.SubscriptionWhereInput = isCustomer && customerId ? { customerId } : {};
    const paymentFilter: Prisma.PaymentWhereInput = isCustomer && customerId ? { customerId } : {};

    const now = new Date();

    // 1. Subscription Counts by Status
    const [totalCustomers, totalProducts, activeSubsCount, pausedSubsCount, closedSubsCount] =
      await Promise.all([
        isCustomer ? 1 : prisma.customerProfile.count(),
        prisma.product.count({ where: { isActive: true } }),
        prisma.subscription.count({ where: { ...subFilter, status: SubscriptionStatus.ACTIVE } }),
        prisma.subscription.count({ where: { ...subFilter, status: SubscriptionStatus.PAUSED } }),
        prisma.subscription.count({ where: { ...subFilter, status: SubscriptionStatus.CLOSED } }),
      ]);

    const allActiveSubs = await prisma.subscription.findMany({
      where: {
        ...subFilter,
        status: SubscriptionStatus.ACTIVE,
      },
      include: {
        plan: {
          select: { billingFrequency: true, intervalCount: true },
        },
      },
    });

    // 2. Monthly Recurring Revenue (MRR) Calculation
    let mrr = 0;
    for (const sub of allActiveSubs) {
      const amount = Number(sub.totalAmount);
      const interval = sub.plan.intervalCount || 1;

      switch (sub.plan.billingFrequency) {
        case 'DAILY':
          mrr += (amount * 30) / interval;
          break;
        case 'WEEKLY':
          mrr += (amount * 4.33) / interval;
          break;
        case 'MONTHLY':
          mrr += amount / interval;
          break;
        case 'YEARLY':
          mrr += amount / (12 * interval);
          break;
      }
    }

    // 3. Total Revenue Collected (Sum of payments)
    const revenueAgg = await prisma.payment.aggregate({
      where: paymentFilter,
      _sum: { amount: true },
    });
    const totalRevenue = Number(revenueAgg._sum.amount || 0);

    // 4. Invoices breakdown
    const [totalInvoicesCount, paidInvoicesCount] = await Promise.all([
      prisma.invoice.count({ where: invoiceFilter }),
      prisma.invoice.count({ where: { ...invoiceFilter, status: InvoiceStatus.PAID } }),
    ]);

    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        ...invoiceFilter,
        status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.DRAFT] },
        balanceDue: { gt: new Prisma.Decimal('0.00') },
      },
      select: {
        id: true,
        balanceDue: true,
        dueDate: true,
      },
    });

    let pendingAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    for (const inv of pendingInvoices) {
      const due = Number(inv.balanceDue);
      pendingAmount += due;
      if (inv.dueDate < now) {
        overdueCount++;
        overdueAmount += due;
      }
    }

    // 5. Recent Activity
    const [recentInvoices, recentPayments, recentSubscriptions] = await Promise.all([
      prisma.invoice.findMany({
        where: invoiceFilter,
        take: 5,
        orderBy: { issueDate: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          grandTotal: true,
          balanceDue: true,
          issueDate: true,
          dueDate: true,
          customer: { select: { companyName: true, contactName: true } },
        },
      }),
      prisma.payment.findMany({
        where: paymentFilter,
        take: 5,
        orderBy: { paymentDate: 'desc' },
        select: {
          id: true,
          paymentReference: true,
          amount: true,
          paymentMethod: true,
          paymentDate: true,
          customer: { select: { companyName: true, contactName: true } },
        },
      }),
      prisma.subscription.findMany({
        where: subFilter,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          subscriptionNumber: true,
          status: true,
          totalAmount: true,
          nextBillingDate: true,
          plan: { select: { name: true } },
          customer: { select: { companyName: true, contactName: true } },
        },
      }),
    ]);

    return {
      metrics: {
        totalCustomers,
        totalProducts,
        activeSubscriptionsCount: activeSubsCount,
        pausedSubscriptionsCount: pausedSubsCount,
        closedSubscriptionsCount: closedSubsCount,
        monthlyRecurringRevenue: Number(mrr.toFixed(2)),
        annualRecurringRevenue: Number((mrr * 12).toFixed(2)),
        totalRevenueCollected: Number(totalRevenue.toFixed(2)),
        totalInvoicesCount,
        paidInvoicesCount,
        pendingInvoicesCount: pendingInvoices.length,
        pendingAmount: Number(pendingAmount.toFixed(2)),
        overdueInvoicesCount: overdueCount,
        overdueAmount: Number(overdueAmount.toFixed(2)),
      },
      recentActivity: {
        invoices: recentInvoices,
        payments: recentPayments,
        subscriptions: recentSubscriptions,
      },
    };
  }

  async getOverview(user: AuthUser) {
    return this.getDashboardMetrics(user);
  }

  async getRevenue(user: AuthUser) {
    const full = await this.getDashboardMetrics(user);
    return {
      totalRevenueCollected: full.metrics.totalRevenueCollected,
      monthlyRecurringRevenue: full.metrics.monthlyRecurringRevenue,
      annualRecurringRevenue: full.metrics.annualRecurringRevenue,
      pendingAmount: full.metrics.pendingAmount,
      overdueAmount: full.metrics.overdueAmount,
      recentPayments: full.recentActivity.payments,
    };
  }

  async getSubscriptions(user: AuthUser) {
    const full = await this.getDashboardMetrics(user);
    return {
      activeSubscriptionsCount: full.metrics.activeSubscriptionsCount,
      pausedSubscriptionsCount: full.metrics.pausedSubscriptionsCount,
      closedSubscriptionsCount: full.metrics.closedSubscriptionsCount,
      recentSubscriptions: full.recentActivity.subscriptions,
    };
  }

  async getInvoices(user: AuthUser) {
    const full = await this.getDashboardMetrics(user);
    return {
      totalInvoicesCount: full.metrics.totalInvoicesCount,
      paidInvoicesCount: full.metrics.paidInvoicesCount,
      pendingInvoicesCount: full.metrics.pendingInvoicesCount,
      pendingAmount: full.metrics.pendingAmount,
      overdueInvoicesCount: full.metrics.overdueInvoicesCount,
      overdueAmount: full.metrics.overdueAmount,
      recentInvoices: full.recentActivity.invoices,
    };
  }
}

export const dashboardService = new DashboardService();
