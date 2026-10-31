import { invoiceService } from '../modules/invoices/invoices.service';
import { logger } from '../utils/logger';

let billingIntervalTimer: NodeJS.Timeout | null = null;
let isJobRunning = false;

/**
 * Execute a single recurring billing cycle run
 */
export async function executeRecurringBillingRun(): Promise<void> {
  if (isJobRunning) {
    logger.warn('[BillingJob] Previous billing job is still in progress, skipping tick.');
    return;
  }

  isJobRunning = true;
  try {
    logger.info('[BillingJob] Starting automated recurring billing check...');
    const result = await invoiceService.processDueRecurringBilling();
    logger.info(
      `[BillingJob] Completed: ${result.processed} processed, ${result.failed} failed out of ${result.totalDue} due.`
    );
  } catch (error: any) {
    logger.error('[BillingJob] Unhandled error during recurring billing run:', error);
  } finally {
    isJobRunning = false;
  }
}

/**
 * Start recurring billing scheduler
 * @param intervalMs Interval between runs (defaults to 1 hour; 60 seconds in test/dev if configured)
 */
export function startBillingScheduler(intervalMs = 60 * 60 * 1000): void {
  if (billingIntervalTimer) {
    logger.warn('[BillingJob] Scheduler is already active.');
    return;
  }

  logger.info(`[BillingJob] Initializing background billing scheduler (Interval: ${intervalMs / 1000}s)`);

  // Run initial check 10 seconds after server boots
  setTimeout(() => {
    executeRecurringBillingRun().catch((err) =>
      logger.error('[BillingJob] Error during initial startup run:', err)
    );
  }, 10000).unref();

  // Recurring schedule
  billingIntervalTimer = setInterval(() => {
    executeRecurringBillingRun().catch((err) =>
      logger.error('[BillingJob] Error during scheduled interval run:', err)
    );
  }, intervalMs).unref();
}

/**
 * Stop scheduler on graceful shutdown
 */
export function stopBillingScheduler(): void {
  if (billingIntervalTimer) {
    clearInterval(billingIntervalTimer);
    billingIntervalTimer = null;
    logger.info('[BillingJob] Billing scheduler stopped cleanly.');
  }
}

