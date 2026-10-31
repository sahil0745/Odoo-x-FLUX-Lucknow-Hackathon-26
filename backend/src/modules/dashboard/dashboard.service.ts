import { SubscriptionStatus, InvoiceStatus, UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { ForbiddenError } from '../../utils/AppError';

export interface DashboardMetrics {
  subscriptions: {
    total: number;
    active: number;
    paused: number;
    draft: number;
    closed: number;
    mrr: number; // Monthly Recurring Revenue
  };
  revenue: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    collectionRatePercent: number;
  };
  overdue: {
    count: number;
    totalAmount: number;
  };
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    grandTotal: number;
    balanceDue: number;
    status: InvoiceStatus;
    issueDate: Date;
    dueDate: Date;
  }>;
  recentPayments: Array<{
    id: string;
    paymentReference: string;
    customerName: string;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
  }>;
}

export class DashboardService {
  async getMetrics(currentUser: {
    id: string;
    role: UserRole;
    customerProfileId?: string | null;
  }): Promise<DashboardMetrics> {
    // Only Admin and Staff can view aggregate business dashboard
    if (currentUser.role === UserRole.CUSTOMER) {
      throw new ForbiddenError('Customers cannot access aggregate business intelligence dashboard');
    }

    const now = new Date();

    // 1. Subscription stats
    const subscriptions = await prisma.subscription.findMany({
      include: {
        plan: true,
      },
    });

    let activeCount = 0;
    let pausedCount = 0;
    let draftCount = 0;
    let closedCount = 0;
    let totalMRR = 0;

    for (const sub of subscriptions) {
      if (sub.status === SubscriptionStatus.ACTIVE) {
        activeCount++;
        // Calculate MRR based on plan billing frequency
        const subTotal = sub.totalAmount.toNumber();
        switch (sub.plan.billingFrequency) {
          case 'DAILY':
            totalMRR += subTotal * 30;
            break;
          case 'WEEKLY':
            totalMRR += subTotal * 4.33;
            break;
          case 'MONTHLY':
            totalMRR += subTotal;
            break;
          case 'YEARLY':
            totalMRR += subTotal / 12;
            break;
          default:
            totalMRR += subTotal;
        }
      } else if (sub.status === SubscriptionStatus.PAUSED) {
        pausedCount++;
      } else if (sub.status === SubscriptionStatus.DRAFT) {
        draftCount++;
      } else if (sub.status === SubscriptionStatus.CLOSED) {
        closedCount++;
      }
    }

    // 2. Invoice revenue aggregates
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
      },
      orderBy: { issueDate: 'desc' },
    });

    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;
    let overdueTotalAmount = 0;

    for (const inv of invoices) {
      if (inv.status !== InvoiceStatus.CANCELLED) {
        const grandTotal = inv.grandTotal.toNumber();
        const paidAmount = inv.paidAmount.toNumber();
        const balanceDue = inv.balanceDue.toNumber();

        totalInvoiced += grandTotal;
        totalCollected += paidAmount;
        totalOutstanding += balanceDue;

        if (inv.status !== InvoiceStatus.PAID && new Date(inv.dueDate) < now) {
          overdueCount++;
          overdueTotalAmount += balanceDue;
        }
      }
    }

    const collectionRatePercent =
      totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100 * 10) / 10 : 0;

    // 3. Recent Invoices
    const recentInvoices = invoices.slice(0, 6).map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer.companyName || inv.customer.contactName,
      grandTotal: inv.grandTotal.toNumber(),
      balanceDue: inv.balanceDue.toNumber(),
      status: inv.status,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
    }));

    // 4. Recent Payments
    const payments = await prisma.payment.findMany({
      include: {
        customer: true,
      },
      orderBy: { paymentDate: 'desc' },
      take: 6,
    });

    const recentPayments = payments.map((p) => ({
      id: p.id,
      paymentReference: p.paymentReference,
      customerName: p.customer.companyName || p.customer.contactName,
      amount: p.amount.toNumber(),
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate,
    }));

    return {
      subscriptions: {
        total: subscriptions.length,
        active: activeCount,
        paused: pausedCount,
        draft: draftCount,
        closed: closedCount,
        mrr: Math.round(totalMRR * 100) / 100,
      },
      revenue: {
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        collectionRatePercent,
      },
      overdue: {
        count: overdueCount,
        totalAmount: Math.round(overdueTotalAmount * 100) / 100,
      },
      recentInvoices,
      recentPayments,
    };
  }
}
