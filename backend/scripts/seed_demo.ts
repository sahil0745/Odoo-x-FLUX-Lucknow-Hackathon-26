import {
  PrismaClient,
  UserRole,
  ProductType,
  BillingFrequency,
  SubscriptionStatus,
  InvoiceStatus,
  TaxType,
  DiscountType,
  DiscountScope,
} from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  console.log('=== SEEDING BRIGHTLOOP SUBSCRIPTION MANAGEMENT SYSTEM ===\n');

  const defaultPassword = 'Brightloop@2026';
  const passwordHash = await hashPassword(defaultPassword);

  // 1. Create or update ADMIN
  console.log('1. Provisioning Administrator...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@brightloop.io' },
    update: { passwordHash, isActive: true },
    create: {
      email: 'admin@brightloop.io',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      staffProfile: {
        create: {
          department: 'Executive Administration',
          title: 'System Administrator',
        },
      },
    },
  });
  console.log(` - Admin ready: admin@brightloop.io (Password: ${defaultPassword})`);

  // 2. Create or update STAFF
  console.log('2. Provisioning Staff Member...');
  await prisma.user.upsert({
    where: { email: 'staff@brightloop.io' },
    update: { passwordHash, isActive: true },
    create: {
      email: 'staff@brightloop.io',
      passwordHash,
      role: UserRole.STAFF,
      isActive: true,
      staffProfile: {
        create: {
          department: 'Subscription Operations',
          title: 'Billing & Operations Specialist',
        },
      },
    },
  });
  console.log(` - Staff ready: staff@brightloop.io (Password: ${defaultPassword})`);

  // 3. Create or update CUSTOMER
  console.log('3. Provisioning Customer Account...');
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@brightloop.io' },
    update: { passwordHash, isActive: true },
    create: {
      email: 'customer@brightloop.io',
      passwordHash,
      role: UserRole.CUSTOMER,
      isActive: true,
      customerProfile: {
        create: {
          contactName: 'Sarah Connor',
          companyName: 'Skynet Research Ltd',
          phone: '+1-555-0199',
          billingAddress: '742 Evergreen Terrace',
          city: 'San Francisco',
          country: 'US',
        },
      },
    },
    include: { customerProfile: true },
  });
  console.log(` - Customer ready: customer@brightloop.io (Password: ${defaultPassword})`);

  const customerProfileId = customerUser.customerProfile?.id;
  if (!customerProfileId) {
    throw new Error('CustomerProfile missing for customer@brightloop.io');
  }

  // 4. Products & Variants
  console.log('4. Provisioning Products & Variants...');
  const productA = await prisma.product.upsert({
    where: { id: 'seed-prod-saas-platform' },
    update: {},
    create: {
      id: 'seed-prod-saas-platform',
      name: 'Brightloop Enterprise Cloud Platform',
      notes: 'Unified multi-tenant subscription engine with automated billing & ledgering.',
      type: ProductType.SOFTWARE,
      salesPrice: 199.0,
      costPrice: 40.0,
      isActive: true,
      variants: {
        create: [
          { variantType: 'Tier', variantValue: '100 Team Seats', additionalPrice: 0.0 },
          { variantType: 'Tier', variantValue: '500 Team Seats Tier', additionalPrice: 150.0 },
        ],
      },
    },
  });

  const productB = await prisma.product.upsert({
    where: { id: 'seed-prod-sla-support' },
    update: {},
    create: {
      id: 'seed-prod-sla-support',
      name: '24/7 Dedicated Support SLA',
      notes: 'Guaranteed 15-minute emergency response and quarterly billing reviews.',
      type: ProductType.SERVICE,
      salesPrice: 79.0,
      costPrice: 20.0,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { id: 'seed-prod-storage' },
    update: {},
    create: {
      id: 'seed-prod-storage',
      name: 'Cloud Storage & Archive Add-On',
      notes: 'Continuous audit retention and automated object snapshot backups.',
      type: ProductType.ADD_ON,
      salesPrice: 29.0,
      costPrice: 5.0,
      isActive: true,
    },
  });

  // 5. Subscription Plans
  console.log('5. Provisioning Billing Cadence Plans...');
  const monthlyPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'seed-plan-monthly' },
    update: {},
    create: {
      id: 'seed-plan-monthly',
      name: 'Monthly Professional Cadence',
      description: 'Standard monthly billing with 14-day trial and 30-day grace closure period.',
      price: 199.0,
      billingFrequency: BillingFrequency.MONTHLY,
      intervalCount: 1,
      availableFrom: new Date(),
      allowPause: true,
      allowRenewal: true,
      allowAutoClose: true,
      isActive: true,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { id: 'seed-plan-annual' },
    update: {},
    create: {
      id: 'seed-plan-annual',
      name: 'Annual Enterprise Commitment',
      description: 'Annual upfront cadence with volume discount savings.',
      price: 1990.0,
      billingFrequency: BillingFrequency.YEARLY,
      intervalCount: 1,
      availableFrom: new Date(),
      allowPause: true,
      allowRenewal: true,
      allowAutoClose: true,
      isActive: true,
    },
  });

  // 6. Taxes & Discounts
  console.log('6. Provisioning Taxes & Coupons...');
  await prisma.taxRule.upsert({
    where: { id: 'seed-tax-vat-10' },
    update: {},
    create: {
      id: 'seed-tax-vat-10',
      name: 'Standard VAT (10%)',
      rate: 10.0,
      taxType: TaxType.PERCENTAGE,
      isDefault: true,
      isActive: true,
    },
  });

  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  await prisma.discountRule.upsert({
    where: { code: 'BRIGHTLOOP20' },
    update: {},
    create: {
      id: 'seed-discount-20',
      name: 'Launch Discount 20%',
      code: 'BRIGHTLOOP20',
      value: 20.0,
      discountType: DiscountType.PERCENTAGE,
      scope: DiscountScope.SUBSCRIPTION,
      startDate: new Date(),
      endDate: nextYear,
      createdById: admin.id,
      currentUsageCount: 1,
      isActive: true,
    },
  });

  // 7. Quotation, Subscription, & Invoices for the Customer
  console.log('7. Creating Initial Active Subscription & Invoice...');
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const sub = await prisma.subscription.upsert({
    where: { subscriptionNumber: 'SUB-2026-00001' },
    update: {},
    create: {
      subscriptionNumber: 'SUB-2026-00001',
      customerId: customerProfileId,
      planId: monthlyPlan.id,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      nextBillingDate: nextMonth,
      subtotal: 278.0,
      taxAmount: 27.8,
      totalAmount: 305.8,
      lines: {
        create: [
          {
            productId: productA.id,
            quantity: 1,
            unitPrice: 199.0,
            taxRate: 10.0,
            taxAmount: 19.9,
            lineTotal: 218.9,
          },
          {
            productId: productB.id,
            quantity: 1,
            unitPrice: 79.0,
            taxRate: 10.0,
            taxAmount: 7.9,
            lineTotal: 86.9,
          },
        ],
      },
    },
  });

  // Create Invoice for the subscription
  const today = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  const invoice = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-00001' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-00001',
      customerId: customerProfileId,
      subscriptionId: sub.id,
      status: InvoiceStatus.CONFIRMED,
      issueDate: today,
      dueDate,
      billingPeriodStart: today,
      billingPeriodEnd: nextMonth,
      subtotal: 278.0,
      taxAmount: 27.8,
      grandTotal: 305.8,
      paidAmount: 0.0,
      balanceDue: 305.8,
      lines: {
        create: [
          {
            productId: productA.id,
            description: 'Brightloop Enterprise Cloud Platform (Monthly)',
            quantity: 1,
            unitPrice: 199.0,
            taxRate: 10.0,
            taxAmount: 19.9,
            lineTotal: 218.9,
          },
          {
            productId: productB.id,
            description: '24/7 Dedicated Support SLA (Monthly)',
            quantity: 1,
            unitPrice: 79.0,
            taxRate: 10.0,
            taxAmount: 7.9,
            lineTotal: 86.9,
          },
        ],
      },
    },
  });

  console.log(` - Active Subscription: ${sub.subscriptionNumber}`);
  console.log(` - Generated Invoice: ${invoice.invoiceNumber} ($${invoice.grandTotal})`);

  console.log('\n=== ALL SEED DATA PROVISIONED SUCCESSFULLY ===');
}

main()
  .catch((e) => {
    console.error('SEEDING FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
