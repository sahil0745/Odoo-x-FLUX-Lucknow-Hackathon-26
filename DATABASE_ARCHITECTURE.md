# Brightloop Subscription Management System — Database Architecture Specification

> **Document Version:** 1.0  
> **Target Database Engine:** PostgreSQL 16 (ACID-compliant relational database)  
> **Object-Relational Mapping (ORM):** Prisma ORM 5.x  
> **Source Requirements:** Original PDF Problem Statement & Master Prompts 01-03

---

## 1. Architectural Principles & Data Integrity Rules

1. **Exact Precision Financial Storage & Currency Standard:**  
   All monetary amounts use PostgreSQL `NUMERIC(12, 2)` represented as Prisma `Decimal`. Never use floating-point types (`FLOAT` or `DOUBLE`) for financial figures. Tax rates and discount percentages use `NUMERIC(5, 2)`. Each financial root entity (`Quotation`, `Subscription`, `Invoice`, `Payment`) carries a `currency` field (defaulting to `"USD"`).
2. **Line-Level Discount Snapshots:**  
   `QuotationLine`, `SubscriptionLine`, and `InvoiceLine` explicitly persist line-level `discountAmount` snapshots, ensuring line discounts are preserved exactly as quoted and contracted.
3. **Immutable Historical Snapshots & Tax Traceability:**  
   Quotation lines, Subscription lines, and Invoice lines store complete frozen snapshots of prices, applied variant surcharges, tax rates, tax amounts, and discount deductions at the exact second they are created. Each line links to `TaxRule` via `taxRuleId` for legal tax audit traceability.
4. **Subscription-Discount Scheduling:**  
   `SubscriptionDiscount` enables discounts to be scheduled onto subscriptions so that they "appear on the next invoice on their own" and are tracked per cycle.
5. **Guaranteed Idempotent Billing (Zero Duplicate Invoices & Retry Tracking):**  
   The recurring billing engine enforces uniqueness at the database level via a composite unique constraint on `(subscriptionId, billingPeriodStart)` in `BillingCycleLog`. `BillingCycleLog` includes `retryCount` and `lastAttemptAt` for exponential backoff retries.
6. **Lifecycle State Transition & Renewal Tracking:**  
   Subscriptions and Invoices use strict PostgreSQL `ENUM` types. Subscriptions track `renewalCount` and `lastRenewedAt` in addition to state transitions audited via `SubscriptionStatusHistory` and `AuditLog`.
7. **No Cascading Financial Deletions:**  
   Financial records (`Invoice`, `Payment`, `PaymentAllocation`, `BillingCycleLog`, `Subscription`) have `onDelete: Restrict` or `onDelete: NoAction`. They cannot be cascade-deleted if a customer or product is deleted.
8. **Sub-2-Second Query Performance:**  
   B-tree compound and partial indexes target hot query paths (active subscriptions due for billing, overdue unpaid invoices, customer dashboard lookups, and revenue aggregations).

---

## 2. Entity Catalog & Domain Models

### Domain 1: Identity, Access & User Management (M01)

#### 1. `User`
- **Purpose:** Central authentication identity across all three roles.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `email`: `String` - Unique email address (strict 1:1 account mapping)
  - `passwordHash`: `String` - Bcrypt password hash (cost factor 12)
  - `role`: `UserRole` Enum (`ADMIN`, `STAFF`, `CUSTOMER`)
  - `isActive`: `Boolean` (default: `true`)
  - `createdAt`: `DateTime` (default: `now()`)
  - `updatedAt`: `DateTime` (auto-update)
- **Relationships:**
  - 1:1 optional with `CustomerProfile`
  - 1:1 optional with `StaffProfile`
  - 1:N with `PasswordResetToken`
  - 1:N with `AuditLog`

#### 2. `CustomerProfile`
- **Purpose:** Extended business metadata for customer accounts.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `userId`: `String` - Unique Foreign Key to `User`
  - `companyName`: `String?`
  - `contactName`: `String`
  - `phone`: `String?`
  - `billingAddress`: `String?`
  - `city`: `String?`
  - `country`: `String?`
  - `taxNumber`: `String?` (e.g. VAT/GST ID)
  - `createdAt`: `DateTime`, `updatedAt`: `DateTime`
- **Relationships:**
  - 1:N with `Subscription`
  - 1:N with `Quotation`
  - 1:N with `Invoice`

#### 3. `StaffProfile`
- **Purpose:** Internal operational staff metadata.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `userId`: `String` - Unique Foreign Key to `User`
  - `department`: `String?`
  - `title`: `String?`
  - `createdById`: `String?` - Self-relation to Admin `User` (enforcing "Only admin creates staff")
  - `createdAt`: `DateTime`, `updatedAt`: `DateTime`

#### 4. `PasswordResetToken`
- **Purpose:** Time-limited, secure tokens for email-based password reset.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `userId`: `String` - Foreign Key to `User`
  - `tokenHash`: `String` - Unique cryptographically secure token hash
  - `expiresAt`: `DateTime` (1 hour lifetime)
  - `usedAt`: `DateTime?`
  - `createdAt`: `DateTime`

---

### Domain 2: Product & Additive Variant Management (M02)

#### 5. `Product`
- **Purpose:** Products, software modules, and add-ons sold by Brightloop.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `name`: `String` (e.g. "Brightloop ERP Core", "Analytics Suite")
  - `type`: `ProductType` Enum (`SOFTWARE`, `SERVICE`, `ADD_ON`)
  - `salesPrice`: `Decimal(12, 2)` - Base catalog selling price
  - `costPrice`: `Decimal(12, 2)` - Cost price for margin analysis
  - `notes`: `String?` - Internal product notes
  - `isActive`: `Boolean` (default: `true`)
  - `createdAt`: `DateTime`, `updatedAt`: `DateTime`
- **Relationships:**
  - 1:N with `ProductVariant`
  - 1:N with `TaxRuleProduct`

#### 6. `ProductVariant`
- **Purpose:** Additive pricing variants (e.g., Brand = Odoo adds +560.00 to base price 1000.00).
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `productId`: `String` - Foreign Key to `Product`
  - `variantType`: `String` (e.g. "Brand", "Tier", "Edition")
  - `variantValue`: `String` (e.g. "Odoo", "Enterprise", "Pro")
  - `additionalPrice`: `Decimal(12, 2)` - Additive surcharge added to base price
  - `isActive`: `Boolean` (default: `true`)
  - `createdAt`: `DateTime`
- **Constraint:** Unique on `(productId, variantType, variantValue)`

---

### Domain 3: Subscription Plan Management (M03)

#### 7. `SubscriptionPlan`
- **Purpose:** Configuration of billing cadences, pricing, and lifecycle behavior.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `name`: `String` (e.g. "Startup Monthly", "Enterprise Annual")
  - `description`: `String?`
  - `price`: `Decimal(12, 2)` - Base recurring plan fee
  - `billingFrequency`: `BillingFrequency` Enum (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`)
  - `intervalCount`: `Int` (default: `1`, supports e.g. 1 month, 3 months, 1 year)
  - `minimumQuantity`: `Int` (default: `1`)
  - `availableFrom`: `DateTime`
  - `availableUntil`: `DateTime?`
  - `allowAutoClose`: `Boolean` (default: `false` - auto close when expired)
  - `allowEarlyClose`: `Boolean` (default: `true` - staff/customer can close early)
  - `allowPause`: `Boolean` (default: `false` - customer can pause plan)
  - `allowRenewal`: `Boolean` (default: `true` - automatic or manual renewal)
  - `isActive`: `Boolean` (default: `true`)
  - `createdAt`: `DateTime`, `updatedAt`: `DateTime`

---

### Domain 4: Quotation Templates & Quotations (M04)

#### 8. `QuotationTemplate`
- **Purpose:** Reusable quotation blueprints for sales representatives.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `name`: `String` (e.g. "Standard SaaS Pack", "Enterprise Yearly Offer")
  - `planId`: `String` - Foreign Key to `SubscriptionPlan`
  - `validityDays`: `Int` (default: `30` days)
  - `description`: `String?`
  - `isActive`: `Boolean` (default: `true`)
  - `createdAt`: `DateTime`, `updatedAt`: `DateTime`

#### 9. `QuotationTemplateLine`
- **Purpose:** Predefined line items inside a quotation template.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `templateId`: `String` - Foreign Key to `QuotationTemplate`
  - `productId`: `String` - Foreign Key to `Product`
  - `variantId`: `String?` - Optional Foreign Key to `ProductVariant`
  - `quantity`: `Int` (default: `1`)
  - `unitPrice`: `Decimal(12, 2)`

#### 10. `Quotation`
- **Purpose:** Negotiated sales offer sent to prospective or existing customers.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `quotationNumber`: `String` - Unique identifier (e.g. `QT-2026-00001`)
  - `customerId`: `String` - Foreign Key to `CustomerProfile`
  - `templateId`: `String?` - Optional Foreign Key to `QuotationTemplate`
  - `planId`: `String` - Foreign Key to `SubscriptionPlan`
  - `salesRepId`: `String` - Foreign Key to `User` (Internal Staff)
  - `status`: `QuotationStatus` Enum (`DRAFT`, `SENT`, `ACCEPTED`, `EXPIRED`, `CONVERTED`, `CANCELLED`)
  - `validityDays`: `Int`
  - `issueDate`: `DateTime`
  - `expiryDate`: `DateTime`
  - `subtotal`: `Decimal(12, 2)`
  - `taxAmount`: `Decimal(12, 2)`
  - `discountAmount`: `Decimal(12, 2)` (default: `0.00`)
  - `totalAmount`: `Decimal(12, 2)`
  - `notes`: `String?`
  - `createdAt`: `DateTime`, `updatedAt`: `DateTime`

#### 11. `QuotationLine`
- **Purpose:** Detailed itemized product lines within a quotation.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `quotationId`: `String` - Foreign Key to `Quotation`
  - `productId`: `String` - Foreign Key to `Product`
  - `variantId`: `String?` - Optional Foreign Key to `ProductVariant`
  - `quantity`: `Int`
  - `unitPrice`: `Decimal(12, 2)`
  - `taxRate`: `Decimal(5, 2)`
  - `taxAmount`: `Decimal(12, 2)`
  - `lineTotal`: `Decimal(12, 2)`

---

### Domain 5: Subscription Management & Lifecycle (M05)

#### 12. `Subscription`
- **Purpose:** The core recurring customer agreement driving automated billing.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `subscriptionNumber`: `String` - Unique identifier (e.g. `SUB-2026-00001`)
  - `customerId`: `String` - Foreign Key to `CustomerProfile`
  - `planId`: `String` - Foreign Key to `SubscriptionPlan`
  - `quotationId`: `String?` - Optional Foreign Key to originating `Quotation`
  - `status`: `SubscriptionStatus` Enum (`DRAFT`, `QUOTATION`, `CONFIRMED`, `ACTIVE`, `PAUSED`, `CLOSED`)
  - `startDate`: `DateTime`
  - `expiryDate`: `DateTime?`
  - `nextBillingDate`: `DateTime`
  - `lastBilledDate`: `DateTime?`
  - `paymentTerms`: `String` (e.g. "Immediate", "Net 15", "Net 30")
  - `subtotal`: `Decimal(12, 2)`
  - `taxAmount`: `Decimal(12, 2)`
  - `discountAmount`: `Decimal(12, 2)` (default: `0.00`)
  - `totalAmount`: `Decimal(12, 2)`
  - `closureReason`: `String?`
  - `closedAt`: `DateTime?`
  - `pausedAt`: `DateTime?`
  - `createdAt`: `DateTime`, `updatedAt`: `DateTime`

#### 13. `SubscriptionLine`
- **Purpose:** Itemized recurring products/seats inside a subscription.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `subscriptionId`: `String` - Foreign Key to `Subscription`
  - `productId`: `String` - Foreign Key to `Product`
  - `variantId`: `String?` - Optional Foreign Key to `ProductVariant`
  - `quantity`: `Int` (enforcing `>= plan.minimumQuantity`)
  - `unitPrice`: `Decimal(12, 2)`
  - `taxRate`: `Decimal(5, 2)`
  - `taxAmount`: `Decimal(12, 2)`
  - `lineTotal`: `Decimal(12, 2)`

#### 14. `SubscriptionDiscount`
- **Purpose:** Scheduled recurring discounts attached to subscriptions that "appear on the next invoice on their own" (Problem Statement Page 4 requirement).
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `subscriptionId`: `String` - Foreign Key to `Subscription`
  - `discountRuleId`: `String?` - Optional Foreign Key to `DiscountRule`
  - `name`: `String` - Discount description/reason
  - `discountType`: `DiscountType` Enum (`PERCENTAGE`, `FIXED_AMOUNT`)
  - `discountValue`: `Decimal(12, 2)` - Percentage (e.g. 10.00%) or flat dollar value
  - `appliedInvoicesCount`: `Int` - Tracks cycles applied
  - `maxInvoicesCount`: `Int?` - Max recurring cycles (NULL for indefinite)
  - `isActive`: `Boolean` (default: `true`)
  - `createdAt`: `DateTime`, `updatedAt`: `DateTime`

#### 15. `SubscriptionStatusHistory`
- **Purpose:** Complete audit trail of subscription lifecycle state transitions.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `subscriptionId`: `String` - Foreign Key to `Subscription`
  - `fromStatus`: `SubscriptionStatus?`
  - `toStatus`: `SubscriptionStatus`
  - `changedById`: `String?` - Foreign Key to `User`
  - `reason`: `String?`
  - `timestamp`: `DateTime` (default: `now()`)

---

### Domain 6: Tax Configuration & Calculation (M10)

#### 16. `TaxRule`
- **Purpose:** Admin-configured tax rates automatically applied during billing.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `name`: `String` (e.g. "Standard GST 18%", "State Sales Tax 8.25%")
  - `taxType`: `TaxType` Enum (`PERCENTAGE`, `FIXED`)
  - `rate`: `Decimal(5, 2)` - Percentage (e.g. 18.00) or fixed amount
  - `isDefault`: `Boolean` (default: `false` - fallback tax rule)
  - `isActive`: `Boolean` (default: `true`)
  - `description`: `String?`
  - `createdAt`: `DateTime`, `updatedAt`: `DateTime`

#### 17. `TaxRuleProduct`
- **Purpose:** Product-to-Tax-Rule mapping (enforcing per-product tax rates with global fallback).
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `taxRuleId`: `String` - Foreign Key to `TaxRule`
  - `productId`: `String` - Foreign Key to `Product`
- **Constraint:** Unique on `(taxRuleId, productId)`

---

### Domain 7: Discount Management (M07)

#### 18. `DiscountRule`
- **Purpose:** Admin-created discount promotions with usage and validity constraints.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `name`: `String` (e.g. "Early Bird 15%", "Enterprise Seat Rebate $500")
  - `code`: `String?` - Optional promo code
  - `discountType`: `DiscountType` Enum (`PERCENTAGE`, `FIXED`)
  - `value`: `Decimal(12, 2)` - Percentage rate (e.g. 15.00) or fixed dollar amount (e.g. 500.00)
  - `scope`: `DiscountScope` Enum (`SUBSCRIPTION`, `PRODUCT`)
  - `productId`: `String?` - Foreign Key to `Product` (mandatory if scope is `PRODUCT`)
  - `minPurchaseAmount`: `Decimal(12, 2)?` - Minimum order value threshold
  - `minQuantity`: `Int?` - Minimum quantity threshold
  - `startDate`: `DateTime`
  - `endDate`: `DateTime`
  - `maxUsageLimit`: `Int?` - Nullable (null = unlimited)
  - `currentUsageCount`: `Int` (default: `0`)
  - `isActive`: `Boolean` (default: `true`)
  - `createdById`: `String` - Foreign Key to Admin `User`
  - `createdAt`: `DateTime`, `updatedAt`: `DateTime`

#### 19. `DiscountApplication`
- **Purpose:** Audit record of discounts applied to invoices and lines.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `discountRuleId`: `String` - Foreign Key to `DiscountRule`
  - `invoiceId`: `String` - Foreign Key to `Invoice`
  - `invoiceLineId`: `String?` - Optional Foreign Key to `InvoiceLine`
  - `appliedAmount`: `Decimal(12, 2)` - Exact monetary discount amount deducted
  - `appliedAt`: `DateTime` (default: `now()`)

---

### Domain 8: Invoices & Automated Billing Engine (M06)

#### 20. `Invoice`
- **Purpose:** Legal billing document generated automatically from an active subscription.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `invoiceNumber`: `String` - Unique sequential number (e.g. `INV-2026-00001`)
  - `subscriptionId`: `String` - Foreign Key to `Subscription`
  - `customerId`: `String` - Foreign Key to `CustomerProfile`
  - `status`: `InvoiceStatus` Enum (`DRAFT`, `CONFIRMED`, `PAID`, `CANCELLED`)
  - `issueDate`: `DateTime`
  - `dueDate`: `DateTime`
  - `billingPeriodStart`: `DateTime`
  - `billingPeriodEnd`: `DateTime`
  - `subtotal`: `Decimal(12, 2)`
  - `discountAmount`: `Decimal(12, 2)` (default: `0.00`)
  - `taxAmount`: `Decimal(12, 2)` (default: `0.00`)
  - `grandTotal`: `Decimal(12, 2)`
  - `paidAmount`: `Decimal(12, 2)` (default: `0.00`)
  - `balanceDue`: `Decimal(12, 2)` (computed: grandTotal - paidAmount)
  - `notes`: `String?`
  - `sentAt`: `DateTime?`
  - `confirmedAt`: `DateTime?`
  - `paidAt`: `DateTime?`
  - `cancelledAt`: `DateTime?`
  - `createdAt`: `DateTime`, `updatedAt`: `DateTime`

#### 21. `InvoiceLine`
- **Purpose:** Itemized billed items preserving historical prices, discounts, and taxes.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `invoiceId`: `String` - Foreign Key to `Invoice`
  - `productId`: `String` - Foreign Key to `Product`
  - `variantId`: `String?` - Optional Foreign Key to `ProductVariant`
  - `description`: `String` (snapshot of product + variant name)
  - `quantity`: `Int`
  - `unitPrice`: `Decimal(12, 2)`
  - `discountAmount`: `Decimal(12, 2)` (default: `0.00`)
  - `taxRate`: `Decimal(5, 2)`
  - `taxAmount`: `Decimal(12, 2)`
  - `lineTotal`: `Decimal(12, 2)`

#### 22. `BillingCycleLog`
- **Purpose:** Absolute protection against duplicate invoices and skipped billing cycles.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `subscriptionId`: `String` - Foreign Key to `Subscription`
  - `billingPeriodStart`: `DateTime`
  - `billingPeriodEnd`: `DateTime`
  - `invoiceId`: `String?` - Unique Foreign Key to generated `Invoice`
  - `status`: `BillingRunStatus` Enum (`PENDING`, `GENERATED`, `SKIPPED`, `FAILED`)
  - `errorMessage`: `String?`
  - `processedAt`: `DateTime` (default: `now()`)
- **Crucial Constraint:** `@@unique([subscriptionId, billingPeriodStart])`

---

### Domain 9: Payments & Multi-Payment Allocations (M08)

#### 23. `Payment`
- **Purpose:** Financial payment receipt recorded against customer account.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `paymentReference`: `String` - Unique transaction receipt number (e.g. `PAY-2026-00001`)
  - `customerId`: `String` - Foreign Key to `CustomerProfile`
  - `amount`: `Decimal(12, 2)` - Total payment sum received
  - `paymentMethod`: `PaymentMethod` Enum (`BANK_TRANSFER`, `CREDIT_CARD`, `CHECK`, `CASH`, `OTHER`)
  - `paymentDate`: `DateTime`
  - `notes`: `String?`
  - `recordedById`: `String` - Foreign Key to `User` (Staff/Admin who verified the payment)
  - `createdAt`: `DateTime`, `updatedAt`: `DateTime`

#### 24. `PaymentAllocation`
- **Purpose:** Links payments to specific invoices, supporting partial and split payments.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `paymentId`: `String` - Foreign Key to `Payment`
  - `invoiceId`: `String` - Foreign Key to `Invoice`
  - `allocatedAmount`: `Decimal(12, 2)` - Specific portion applied to this invoice
  - `createdAt`: `DateTime` (default: `now()`)

---

### Domain 10: System Auditing & Traceability (Security)

#### 25. `AuditLog`
- **Purpose:** Immutable change tracking for all critical financial and operational mutations.
- **Fields:**
  - `id`: `String` (UUID v4) - Primary Key
  - `userId`: `String?` - Foreign Key to `User`
  - `action`: `String` (e.g. "CREATE", "UPDATE", "STATUS_CHANGE", "CANCEL")
  - `entityName`: `String` (e.g. "Subscription", "Invoice", "DiscountRule")
  - `entityId`: `String`
  - `previousValues`: `Json?`
  - `newValues`: `Json?`
  - `ipAddress`: `String?`
  - `userAgent`: `String?`
  - `createdAt`: `DateTime` (default: `now()`)

---

## 3. High-Performance Indexing Strategy (Sub-2-Second Response Target)

| Table | Index Columns | Index Type | Query Justification |
|---|---|---|---|
| `User` | `email` | Unique B-tree | Instant credential lookup on login |
| `User` | `role`, `isActive` | Compound | Fast filtering of staff and customers |
| `CustomerProfile` | `userId` | Unique B-tree | 1:1 user profile resolution |
| `ProductVariant` | `productId`, `variantType` | Compound | Fast retrieval of variants during quote creation |
| `Subscription` | `customerId`, `status` | Compound | Customer portal dashboard (instant load) |
| `Subscription` | `nextBillingDate`, `status` | Compound | Billing engine: find all `ACTIVE` due today |
| `Subscription` | `expiryDate` | B-tree | Auto-close and renewal scheduler jobs |
| `Subscription` | `subscriptionNumber` | Unique B-tree | Exact search by subscription number |
| `Invoice` | `subscriptionId` | B-tree | Subscription billing history list |
| `Invoice` | `customerId`, `status` | Compound | Customer invoice tab filtering |
| `Invoice` | `status`, `dueDate` | Compound | Finance Lead overdue invoice tracking |
| `Invoice` | `invoiceNumber` | Unique B-tree | Exact invoice search |
| `Payment` | `customerId`, `paymentDate` | Compound | Customer payment history lookup |
| `PaymentAllocation` | `invoiceId` | B-tree | Instant calculation of paid vs balance due |
| `BillingCycleLog` | `subscriptionId`, `billingPeriodStart` | Composite Unique | **100% duplicate billing prevention** |
| `DiscountRule` | `isActive`, `startDate`, `endDate` | Compound | Billing engine: find eligible discounts |
| `AuditLog` | `entityName`, `entityId`, `createdAt` | Compound | Fast history inspection for any record |
