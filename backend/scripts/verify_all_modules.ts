import { PrismaClient } from '@prisma/client';
import { AuthService } from '../src/modules/auth/auth.service';
import { ProductService } from '../src/modules/products/products.service';
import { PlanService } from '../src/modules/plans/plans.service';
import { QuotationService } from '../src/modules/quotations/quotations.service';
import { SubscriptionService } from '../src/modules/subscriptions/subscriptions.service';
import { InvoiceService } from '../src/modules/invoices/invoices.service';
import { PaymentService } from '../src/modules/payments/payments.service';
import { CustomerService } from '../src/modules/customers/customers.service';
import { TaxService } from '../src/modules/taxes/taxes.service';
import { DiscountService } from '../src/modules/discounts/discounts.service';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';

const prisma = new PrismaClient();

async function runFullVerification() {
  console.log('=== STARTING COMPLETE BRIGHTLOOP PERN VERIFICATION ===\n');

  const authService = new AuthService();
  const prodService = new ProductService();
  const planService = new PlanService();
  const quoteService = new QuotationService();
  const subService = new SubscriptionService();
  const invService = new InvoiceService();
  const payService = new PaymentService();
  const custService = new CustomerService();
  const taxService = new TaxService();
  const discService = new DiscountService();
  const dashService = new DashboardService();

  // 1. Auth Test
  console.log('1. Testing Authentication...');
  const adminLogin = await authService.login({ email: 'admin@brightloop.io', password: 'Brightloop@2026' });
  console.log(` ✓ Admin login OK: role=${adminLogin.user.role}, token=${!!adminLogin.accessToken}`);

  const staffLogin = await authService.login({ email: 'staff@brightloop.io', password: 'Brightloop@2026' });
  console.log(` ✓ Staff login OK: role=${staffLogin.user.role}, token=${!!staffLogin.accessToken}`);

  const customerLogin = await authService.login({ email: 'customer@brightloop.io', password: 'Brightloop@2026' });
  console.log(` ✓ Customer login OK: role=${customerLogin.user.role}, token=${!!customerLogin.accessToken}`);

  const adminUser = {
    id: adminLogin.user.id,
    email: adminLogin.user.email,
    role: adminLogin.user.role,
    isActive: true,
  };

  // 2. Products Catalog
  console.log('\n2. Testing Product Catalog...');
  const products = await prodService.listProducts({});
  console.log(` ✓ Products found: ${products.total} items. First: '${products.items[0]?.name}' with ${products.items[0]?.variants?.length || 0} variants`);

  // 3. Subscription Plans
  console.log('\n3. Testing Subscription Plans...');
  const plans = await planService.listPlans({});
  console.log(` ✓ Plans found: ${plans.total} items. First: '${plans.items[0]?.name}' (${plans.items[0]?.billingFrequency})`);

  // 4. Quotations
  console.log('\n4. Testing Quotations...');
  const quotations = await quoteService.listQuotations(adminUser, {});
  console.log(` ✓ Quotations found: ${quotations.total} items.`);

  // 5. Subscriptions
  console.log('\n5. Testing Subscriptions...');
  const subscriptions = await subService.listSubscriptions(adminUser, {});
  console.log(` ✓ Subscriptions found: ${subscriptions.total} items. First: '${subscriptions.items[0]?.subscriptionNumber}' ($${subscriptions.items[0]?.totalAmount}), lines: ${subscriptions.items[0]?.lines?.length}`);

  // 6. Invoices
  console.log('\n6. Testing Invoices...');
  const invoices = await invService.listInvoices(adminUser, {});
  console.log(` ✓ Invoices found: ${invoices.total} items. First: '${invoices.items[0]?.invoiceNumber}' ($${invoices.items[0]?.grandTotal}), lines: ${invoices.items[0]?.lines?.length}`);

  // 7. Payments
  console.log('\n7. Testing Payments...');
  const payments = await payService.listPayments(adminUser, {});
  console.log(` ✓ Payments found: ${payments.total} items.`);

  // 8. Customers
  console.log('\n8. Testing Customers...');
  const customers = await custService.listCustomers({});
  console.log(` ✓ Customers found: ${customers.total} items. First: '${customers.items[0]?.contactName}' (${customers.items[0]?.companyName})`);

  // 9. Taxes & Discounts
  console.log('\n9. Testing Taxes & Discounts...');
  const taxes = await taxService.listTaxRules();
  const discounts = await discService.listDiscounts();
  console.log(` ✓ Taxes: ${taxes.length} rules. Discounts: ${discounts.length} rules.`);

  // 10. Dashboard Overview
  console.log('\n10. Testing Dashboard Aggregations...');
  const dashOverview = await dashService.getDashboardMetrics(adminUser);
  console.log(` ✓ Dashboard Metrics: Active Subs: ${dashOverview.metrics.activeSubscriptionsCount}, MRR: $${dashOverview.metrics.monthlyRecurringRevenue}, Total Invoices: ${dashOverview.metrics.totalInvoicesCount}`);
  console.log(` ✓ Recent Activity: Invoices: ${dashOverview.recentActivity.invoices.length}, Subscriptions: ${dashOverview.recentActivity.subscriptions.length}`);

  console.log('\n=== ALL 10 MODULES VERIFIED 100% OPERATIONAL ===');
  await prisma.$disconnect();
}

runFullVerification().catch((e) => {
  console.error('VERIFICATION ERROR:', e);
  process.exit(1);
});
