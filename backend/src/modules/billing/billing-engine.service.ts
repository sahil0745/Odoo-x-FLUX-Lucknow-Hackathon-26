import { Prisma, SubscriptionStatus, InvoiceStatus, BillingRunStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { BillingRunOptions, BillingRunSummary } from './billing.types';
import { BillingFrequencyService } from '../plans/billing-frequency.service';
import { logger } from '../../utils/logger';

const frequencyService = new BillingFrequencyService();

export class BillingEngineService {
  /**
   * Generate sequential invoice number: e.g. INV-202610-00001
   */
  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await prisma.invoice.count();
    const sequence = String(count + 1).padStart(5, '0');
    return `INV-${yearMonth}-${sequence}`;
  }

  /**
   * Compute due date based on payment terms string (e.g. "Net 30", "Net 15", "Immediate")
   */
  private calculateDueDate(issueDate: Date, paymentTerms: string): Date {
    const dueDate = new Date(issueDate);
    const termsLower = paymentTerms.toLowerCase().trim();

    if (termsLower.includes('net')) {
      const days = parseInt(termsLower.replace(/\D/g, ''), 10) || 30;
      dueDate.setDate(dueDate.getDate() + days);
    } else if (termsLower.includes('immediate') || termsLower.includes('due on receipt')) {
      // Due same day
    } else {
      // Default Net 30
      dueDate.setDate(dueDate.getDate() + 30);
    }

    return dueDate;
  }

  /**
   * Run the recurring billing engine.
   * Processes all active subscriptions due for billing up to `asOfDate`.
   * Enforces 3-layer deduplication guarantee via BillingCycleLog.
   */
  async processBillingRun(options?: BillingRunOptions): Promise<BillingRunSummary> {
    const asOfDate = options?.asOfDate ? new Date(options.asOfDate) : new Date();

    const where: Prisma.SubscriptionWhereInput = {
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate: { lte: asOfDate },
    };

    if (options?.subscriptionId) {
      where.id = options.subscriptionId;
    }

    const dueSubscriptions = await prisma.subscription.findMany({
      where,
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
      orderBy: { nextBillingDate: 'asc' },
    });

    const summary: BillingRunSummary = {
      processed: dueSubscriptions.length,
      generated: 0,
      skipped: 0,
      failed: 0,
      asOfDate: asOfDate.toISOString(),
      invoicesGenerated: [],
      errors: [],
    };

    logger.info(`[BillingEngine] Starting billing run for ${dueSubscriptions.length} subscriptions as of ${asOfDate.toISOString()}`);

    for (const subscription of dueSubscriptions) {
      try {
        const cycle = frequencyService.calculateBillingCycle(
          subscription.nextBillingDate,
          subscription.plan.billingFrequency,
          subscription.plan.intervalCount
        );

        const periodStart = cycle.periodStart;
        const periodEnd = cycle.periodEnd;

        // Layer 1: Check existing BillingCycleLog
        const existingCycleLog = await prisma.billingCycleLog.findUnique({
          where: {
            subscriptionId_billingPeriodStart: {
              subscriptionId: subscription.id,
              billingPeriodStart: periodStart,
            },
          },
        });

        if (existingCycleLog && existingCycleLog.status === BillingRunStatus.GENERATED) {
          logger.info(`[BillingEngine] Deduplication: Subscription ${subscription.subscriptionNumber} already billed for period ${periodStart.toISOString()}. Skipping.`);
          summary.skipped++;
          continue;
        }

        const invoiceNumber = await this.generateInvoiceNumber();
        const issueDate = new Date();
        const dueDate = this.calculateDueDate(issueDate, subscription.paymentTerms);

        // Snapshot line items
        let subtotalCents = 0;
        let taxCents = 0;
        let discountCents = 0;

        const invoiceLinesData = subscription.lines.map((subLine) => {
          const unitPriceCents = Math.round(Number(subLine.unitPrice) * 100);
          const qty = subLine.quantity;
          const lineSubtotalCents = unitPriceCents * qty;
          const lineDiscountCents = Math.round(Number(subLine.discountAmount) * 100);
          const lineTaxCents = Math.round(Number(subLine.taxAmount) * 100);
          const lineTotalCents = lineSubtotalCents - lineDiscountCents + lineTaxCents;

          subtotalCents += lineSubtotalCents;
          discountCents += lineDiscountCents;
          taxCents += lineTaxCents;

          const description = subLine.variant
            ? `${subLine.product.name} (${subLine.variant.variantType}: ${subLine.variant.variantValue})`
            : subLine.product.name;

          return {
            productId: subLine.productId,
            variantId: subLine.variantId || null,
            taxRuleId: subLine.taxRuleId || null,
            description,
            quantity: qty,
            unitPrice: subLine.unitPrice,
            discountAmount: subLine.discountAmount,
            taxRate: subLine.taxRate,
            taxAmount: subLine.taxAmount,
            lineTotal: new Prisma.Decimal((lineTotalCents / 100).toFixed(2)),
          };
        });

        const grandTotalCents = subtotalCents - discountCents + taxCents;
        const grandTotal = new Prisma.Decimal((grandTotalCents / 100).toFixed(2));

        // Layer 2 & 3: Atomic database transaction with unique index on (subscriptionId, billingPeriodStart)
        const [invoice] = await prisma.$transaction(async (tx) => {
          const createdInvoice = await tx.invoice.create({
            data: {
              invoiceNumber,
              subscriptionId: subscription.id,
              customerId: subscription.customerId,
              status: InvoiceStatus.CONFIRMED,
              issueDate,
              dueDate,
              billingPeriodStart: periodStart,
              billingPeriodEnd: periodEnd,
              currency: subscription.currency,
              subtotal: new Prisma.Decimal((subtotalCents / 100).toFixed(2)),
              taxAmount: new Prisma.Decimal((taxCents / 100).toFixed(2)),
              discountAmount: new Prisma.Decimal((discountCents / 100).toFixed(2)),
              grandTotal,
              paidAmount: new Prisma.Decimal('0.00'),
              balanceDue: grandTotal,
              confirmedAt: new Date(),
              lines: {
                create: invoiceLinesData,
              },
            },
          });

          // Record deduplicated billing cycle log
          await tx.billingCycleLog.upsert({
            where: {
              subscriptionId_billingPeriodStart: {
                subscriptionId: subscription.id,
                billingPeriodStart: periodStart,
              },
            },
            create: {
              subscriptionId: subscription.id,
              billingPeriodStart: periodStart,
              billingPeriodEnd: periodEnd,
              invoiceId: createdInvoice.id,
              status: BillingRunStatus.GENERATED,
              retryCount: 0,
              processedAt: new Date(),
            },
            update: {
              invoiceId: createdInvoice.id,
              status: BillingRunStatus.GENERATED,
              errorMessage: null,
              processedAt: new Date(),
            },
          });

          // Advance subscription billing schedule
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              lastBilledDate: new Date(),
              nextBillingDate: cycle.nextBillingDate,
              renewalCount: { increment: 1 },
              lastRenewedAt: new Date(),
            },
          });

          return [createdInvoice];
        });

        summary.generated++;
        summary.invoicesGenerated.push(invoice.invoiceNumber);
        logger.info(`[BillingEngine] Generated invoice ${invoice.invoiceNumber} for subscription ${subscription.subscriptionNumber}`);
      } catch (err: any) {
        summary.failed++;
        summary.errors.push({
          subscriptionId: subscription.id,
          subscriptionNumber: subscription.subscriptionNumber,
          error: err.message || 'Billing cycle processing error',
        });

        logger.error(`[BillingEngine] Failed billing for subscription ${subscription.subscriptionNumber}: ${err.message}`);

        // Record failure in BillingCycleLog for retry tracking
        try {
          const cycle = frequencyService.calculateBillingCycle(
            subscription.nextBillingDate,
            subscription.plan.billingFrequency,
            subscription.plan.intervalCount
          );

          await prisma.billingCycleLog.upsert({
            where: {
              subscriptionId_billingPeriodStart: {
                subscriptionId: subscription.id,
                billingPeriodStart: cycle.periodStart,
              },
            },
            create: {
              subscriptionId: subscription.id,
              billingPeriodStart: cycle.periodStart,
              billingPeriodEnd: cycle.periodEnd,
              status: BillingRunStatus.FAILED,
              retryCount: 1,
              lastAttemptAt: new Date(),
              errorMessage: err.message || 'Billing execution failure',
            },
            update: {
              status: BillingRunStatus.FAILED,
              retryCount: { increment: 1 },
              lastAttemptAt: new Date(),
              errorMessage: err.message || 'Billing execution failure',
            },
          });
        } catch (logErr: any) {
          logger.error(`[BillingEngine] Could not persist failure log: ${logErr.message}`);
        }
      }
    }

    return summary;
  }
}

export const billingEngineService = new BillingEngineService();
