# Brightloop Subscription Management System — Subscription Plan Management Module (M03)

> **Module Version:** 1.0  
> **Source Requirements:** Original Problem Statement PDF (Page 3) & Master Prompt 06  
> **Target Database Engine:** PostgreSQL 16 (Activation deferred to final stage)  
> **ORM:** Prisma ORM 5.x  
> **Date Math Engine:** UTC Calendar-Aware Calculation Service  

---

## 1. Executive Summary & Core Purpose

The **Subscription Plan Management Module (M03)** provides the centralized catalog of subscription offerings for the Brightloop Subscription Management System. A subscription plan defines the recurring billing terms, pricing, order quantity guardrails, availability date windows, and lifecycle behavior that apply when a customer orders software licenses, platform access, or service packages.

### Primary Responsibilities:
1. **Recurring Cadence & Pricing**: Establishing recurring charges with exact decimal precision across Daily, Weekly, Monthly, and Yearly frequencies.
2. **Minimum Quantity Enforcement**: Server-side validation ensuring that any customer order or quotation meets or exceeds the plan's mandatory minimum required units.
3. **Availability & Closing Windows**: Enforcing date windows (`availableFrom` to `availableUntil`), automatic expiration closing, and permitted early cancellation.
4. **Pause & Renewal Governance**: Declaring whether plans can be temporarily paused by subscribers and whether contracts automatically renew at term completion.
5. **Product & Quotation Integration**: Serving as the billing engine referenced by `QuotationTemplate`, `Quotation`, and `Subscription` entities.
6. **Historical Price Protection**: Guaranteeing that price adjustments on plans never retroactively alter historical quotations, active subscriptions, or finalized invoices.

---

## 2. Actual Prisma Schema Specification

The `SubscriptionPlan` model is fully implemented in `backend/prisma/schema.prisma` without requiring schema alterations or destructive migrations:

```prisma
enum BillingFrequency {
  DAILY
  WEEKLY
  MONTHLY
  YEARLY
}

model SubscriptionPlan {
  id               String           @id @default(uuid())
  name             String
  description      String?
  price            Decimal          @db.Decimal(12, 2)
  billingFrequency BillingFrequency @default(MONTHLY)
  intervalCount    Int              @default(1) // 1 = monthly, 3 = quarterly, 1 = annual
  minimumQuantity  Int              @default(1)
  availableFrom    DateTime
  availableUntil   DateTime?
  allowAutoClose   Boolean          @default(false)
  allowEarlyClose  Boolean          @default(true)
  allowPause       Boolean          @default(false)
  allowRenewal     Boolean          @default(true)
  isActive         Boolean          @default(true)
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  subscriptions      Subscription[]
  quotationTemplates QuotationTemplate[]
  quotations         Quotation[]

  @@index([isActive, billingFrequency])
  @@index([availableFrom, availableUntil])
}
```

### Field Definitions:

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | UUID (String) | `@id @default(uuid())` | Primary key unique plan identifier |
| `name` | String | Mandatory, Unique (case-insensitive) | Display name of plan (e.g. "Startup Monthly") |
| `description` | String? | Nullable, max 2000 chars | Public and operational description |
| `price` | Decimal(12, 2) | Stored as `Decimal` | Base recurring fee per unit/period |
| `billingFrequency` | Enum | `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` | Calendar cadence of recurring billing |
| `intervalCount` | Int | Default `1`, min `1` | Multiplier (e.g., 3 with MONTHLY = Quarterly) |
| `minimumQuantity` | Int | Default `1`, min `1` | Minimum units customer must order |
| `availableFrom` | DateTime | Mandatory | Date when plan becomes available |
| `availableUntil` | DateTime? | Nullable | Expiration date of plan availability |
| `allowAutoClose` | Boolean | Default `false` | Subscriptions auto-close when expired |
| `allowEarlyClose` | Boolean | Default `true` | Allows cancellation before renewal date |
| `allowPause` | Boolean | Default `false` | Customers can pause recurring billing |
| `allowRenewal` | Boolean | Default `true` | Permits auto or manual contract renewal |
| `isActive` | Boolean | Default `true` | Toggle for new customer purchases |
| `createdAt` / `updatedAt` | DateTime | Auto-managed | Audit timestamps |

---

## 3. Product & Catalog Integration

In Brightloop's relational model:
- **`SubscriptionPlan`** models the *contract terms, cadence, and baseline recurring price*.
- **`Product` & `ProductVariant`** model the *deliverables, catalog items, and additive features*.
- **`QuotationTemplate` & `QuotationTemplateLine`** act as the bridge linking plans with specific active products.

When an administrator creates a plan with `associatedProductIds`:
1. The backend verifies all requested products exist and have `isActive = true`.
2. A default `QuotationTemplate` is created linking `planId` with `QuotationTemplateLine` entries referencing the selected products.
3. When querying plan details, associated products are populated from the active quotation templates for unified management.

---

## 4. Minimum Quantity Enforcement

The original PDF explicitly dictates:
> *"The subscription plan must support: minimum quantity..."*

Our reusable engine (`PlanQuantityService`) enforces:
1. **Positive Integer Validation**: Quantity must be a whole positive integer (`>= 1`).
2. **Fractional Rejection**: Decimal quantities (e.g. `2.5`) are rejected with `ValidationError`.
3. **Threshold Check**: `quantity >= plan.minimumQuantity`.

```ts
const result = planQuantityService.validateQuantity(quantity, plan.minimumQuantity);
if (!result.isValid) {
  throw new ValidationError(result.error);
}
```

---

## 5. Safe Activation, Deactivation & Reference Integrity

1. **Deactivation Safety**:
   - Setting `isActive = false` removes the plan from customer visibility and prevents new subscriptions or quotation drafts.
   - **Crucial**: Existing active subscriptions, pending invoices, and accepted quotations remain fully intact and continue to be billed.
2. **Deletion Guardrails**:
   - Physical deletion (`DELETE /api/v1/plans/:id`) is blocked if the plan is referenced by:
     - Any `Subscription` record (`subscriptions.length > 0`)
     - Any `Quotation` record (`quotations.length > 0`)
     - Any `QuotationTemplate` record (`quotationTemplates.length > 0`)
   - Returns HTTP `409 Conflict` advising administrator to deactivate the plan instead.

---

## 6. Financial Precision & Multi-Currency Standards

- All monetary plan prices use PostgreSQL `NUMERIC(12, 2)` mapped to `Prisma.Decimal`.
- String representations formatted via `.toFixed(2)` preserve trailing zeroes (e.g. `199.90`, not `199.9`).
- Currency is configurable via environment variable `DEFAULT_CURRENCY` (defaulting to `"USD"`).
- Displays adhere to standard cadence formatting: e.g. `USD 199.99 / Monthly` or `EUR 250.00 / Every 3 Months`.

---

## 7. PostgreSQL Activation Status

Per system instructions:
- PostgreSQL live activation is intentionally deferred until the final project stage.
- Docker containers and `prisma migrate dev` are not run during this stage.
- Prisma Client is compiled and validated against the schema.
- All 13 test files and 140 backend tests pass with 100% deterministic mocking.
