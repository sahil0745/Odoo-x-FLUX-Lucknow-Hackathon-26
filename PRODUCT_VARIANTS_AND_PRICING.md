# Brightloop Subscription Management System — Product Variants & Additive Pricing Architecture

> **Document Version:** 1.0  
> **Target Framework:** Decimal Pricing Engine (`product-pricing.service.ts`)  
> **Database Mapping:** Prisma ORM 5.x on PostgreSQL `NUMERIC(12, 2)`

---

## 1. Additive Pricing Concept & Business Context

In Brightloop, software solutions frequently offer base platform licenses accompanied by configurable editions, brands, and service tiers. Rather than generating dozens of separate SKU combinations in the catalog, Brightloop implements **Additive Variant Pricing**.

### Core Formula:
$$\text{Final Sales Price} = \text{Base Sales Price} + \sum_{i=1}^{n} \text{Variant Additional Price}_i$$

### Business Case Example:
- **Base Product:** Odoo ERP Core
  - Base Sales Price: `$1,000.00`
- **Selected Variant:** Odoo Enterprise Configuration Surcharge
  - Additional Price: `+$560.00`
- **Resulting Final Selling Price:**
  $$\$1,000.00 + \$560.00 = \$1,560.00$$

The pricing engine is generalized so that any product across `SOFTWARE`, `SERVICE`, or `ADD_ON` classifications can attach zero, one, or multiple additive variants.

---

## 2. Financial Precision & Exact Decimal Arithmetic

Financial calculations in Brightloop strictly utilize `Prisma.Decimal` (backed by arbitrary-precision arithmetic library `decimal.js`). Native JavaScript IEEE 754 floating-point numbers are prohibited in calculation paths.

### Floating-Point Risk vs. Prisma Decimal:
| Scenario | JavaScript Float (`number`) | Prisma Decimal (`NUMERIC(12, 2)`) |
|---|---|---|
| Simple Sum (`0.10 + 0.20`) | `0.30000000000000004` ❌ | `0.30` ✅ |
| Additive Variant (`1000.00 + 560.00`) | Prone to cumulative rounding drift | `1560.00` (Exact) ✅ |
| Database Column Type | `DOUBLE PRECISION` (Inaccurate) | `NUMERIC(12, 2)` (Audited) ✅ |

---

## 3. Variant Uniqueness Strategy & Schema Audit

Earlier design reports contained varying descriptions of the composite uniqueness constraint on `ProductVariant`:
- *Report A:* `unique([productId, variantType, variantValue])`
- *Report B:* `unique([productId, variantType])`

### Final Production Strategy:
The Prisma schema enforces:
```prisma
model ProductVariant {
  id              String   @id @default(uuid())
  productId       String
  variantType     String   // e.g. "Brand", "Edition", "UserTier"
  variantValue    String   // e.g. "Odoo Enterprise", "Pro 10-Pack"
  additionalPrice Decimal  @db.Decimal(12, 2)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, variantType, variantValue])
  @@index([productId, isActive])
}
```

### Architectural Analysis:
- If the constraint were `@@unique([productId, variantType])`, a product could only have a **single** value per type. A product could never offer both `"Community"` and `"Enterprise"` under the `"Edition"` type.
- The `@@unique([productId, variantType, variantValue])` constraint correctly allows multiple distinct options within the same variant category while strictly preventing duplicate identical entries (e.g. creating two `"Edition: Enterprise"` rows on the same product).

---

## 4. Pricing Engine Validation Rules

The `ProductPricingService` executes the following validation pipeline:

1. **Base Price Validation:** Converts input to `Prisma.Decimal`, asserting non-negative finite value.
2. **Duplicate Selection Prevention:** Tracks variant IDs in a Set; any duplicate ID in `selectedVariantIds` throws `ValidationError`.
3. **Active Status Verification:** Inactive variants (`isActive === false`) cannot be selected for price calculations.
4. **Product Ownership Guard:** Asserts that every presented variant ID belongs to the target `productId`. Foreign variant IDs are rejected.
5. **Conflicting Option Guard:** Prevents choosing conflicting options of the same category (e.g. simultaneously selecting two different `"Edition"` variants on a single product).
6. **Detailed Breakdown Return:** Returns base price, itemized variant additions, total variant additions, and the final price in standard 2-decimal string format.

---

## 5. Historical Price Snapshot Strategy

In upcoming modules (Quotations, Subscriptions, Invoices):
- Changing a product's base price or variant surcharge in the catalog **never** updates existing quotes, contracts, or invoices.
- Quotation lines, subscription lines, and invoice lines store frozen snapshot fields (`unitPrice`, `salesPrice`, `additionalPrice`).
- This guarantees absolute accounting auditability over time.
