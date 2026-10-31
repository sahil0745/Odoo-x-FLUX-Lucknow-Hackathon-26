# Brightloop Subscription Management System — Database Relationships & Referential Integrity

This document details the relational mappings, cardinality, foreign keys, and cascading behaviors implemented across the database.

---

## 1. Cardinality & Foreign Key Registry

### Identity & Profiles
| Source Entity | Target Entity | Cardinality | Foreign Key | Cascade Rule | Business Justification |
|---|---|---|---|---|---|
| `User` | `CustomerProfile` | 1:1 (optional) | `CustomerProfile.userId` | `onDelete: Cascade` | Deleting a customer user removes the profile data |
| `User` | `StaffProfile` | 1:1 (optional) | `StaffProfile.userId` | `onDelete: Cascade` | Deleting a staff user removes staff profile data |
| `User` | `PasswordResetToken` | 1:N | `PasswordResetToken.userId` | `onDelete: Cascade` | Expired/pending tokens deleted with user |
| `User` (Staff) | `StaffProfile` | 1:N | `StaffProfile.createdById` | `onDelete: SetNull` | Preserves staff record if creating admin changes |

### Catalog: Products & Variants
| Source Entity | Target Entity | Cardinality | Foreign Key | Cascade Rule | Business Justification |
|---|---|---|---|---|---|
| `Product` | `ProductVariant` | 1:N | `ProductVariant.productId` | `onDelete: Cascade` | Variants exist only as attributes of a parent product |
| `Product` | `TaxRuleProduct` | 1:N | `TaxRuleProduct.productId` | `onDelete: Cascade` | Removes tax mapping if product deleted |
| `TaxRule` | `TaxRuleProduct` | 1:N | `TaxRuleProduct.taxRuleId` | `onDelete: Cascade` | Removes tax mapping if tax rule deleted |

### Quotations & Templates
| Source Entity | Target Entity | Cardinality | Foreign Key | Cascade Rule | Business Justification |
|---|---|---|---|---|---|
| `SubscriptionPlan` | `QuotationTemplate` | 1:N | `QuotationTemplate.planId` | `onDelete: Restrict` | Cannot delete plan if templates rely on it |
| `QuotationTemplate` | `QuotationTemplateLine` | 1:N | `QuotationTemplateLine.templateId` | `onDelete: Cascade` | Deleting template removes its lines |
| `Product` | `QuotationTemplateLine` | 1:N | `QuotationTemplateLine.productId` | `onDelete: Restrict` | Cannot delete product in active template |
| `CustomerProfile` | `Quotation` | 1:N | `Quotation.customerId` | `onDelete: Restrict` | Quotations must remain auditable |
| `Quotation` | `QuotationLine` | 1:N | `QuotationLine.quotationId` | `onDelete: Cascade` | Lines deleted with parent quotation draft |
| `Product` | `QuotationLine` | 1:N | `QuotationLine.productId` | `onDelete: Restrict` | Quoted product history cannot be broken |

### Subscriptions & Contracts
| Source Entity | Target Entity | Cardinality | Foreign Key | Cascade Rule | Business Justification |
|---|---|---|---|---|---|
| `CustomerProfile` | `Subscription` | 1:N | `Subscription.customerId` | `onDelete: Restrict` | Active/closed subscriptions cannot be cascade deleted |
| `SubscriptionPlan` | `Subscription` | 1:N | `Subscription.planId` | `onDelete: Restrict` | Plan cannot be deleted if active contracts exist |
| `Quotation` | `Subscription` | 1:1 (optional) | `Subscription.quotationId` | `onDelete: SetNull` | Originating quote reference can be retained or decoupled |
| `Subscription` | `SubscriptionLine` | 1:N | `SubscriptionLine.subscriptionId` | `onDelete: Cascade` | Contract lines live with parent subscription |
| `Product` | `SubscriptionLine` | 1:N | `SubscriptionLine.productId` | `onDelete: Restrict` | Product historical lines cannot be severed |
| `Subscription` | `SubscriptionStatusHistory` | 1:N | `SubscriptionStatusHistory.subscriptionId` | `onDelete: Cascade` | History lifecycle belongs to subscription |
| `Subscription` | `SubscriptionDiscount` | 1:N | `SubscriptionDiscount.subscriptionId` | `onDelete: Cascade` | Scheduled discount belongs to subscription contract |

### Invoices, Billing Engine & Deduplication
| Source Entity | Target Entity | Cardinality | Foreign Key | Cascade Rule | Business Justification |
|---|---|---|---|---|---|
| `Subscription` | `Invoice` | 1:N | `Invoice.subscriptionId` | `onDelete: Restrict` | **Financial Integrity:** Invoices cannot be deleted with subscription |
| `CustomerProfile` | `Invoice` | 1:N | `Invoice.customerId` | `onDelete: Restrict` | Invoices remain immutable tax records |
| `Invoice` | `InvoiceLine` | 1:N | `InvoiceLine.invoiceId` | `onDelete: Restrict` | Invoice lines cannot be altered/removed once generated |
| `Subscription` | `BillingCycleLog` | 1:N | `BillingCycleLog.subscriptionId` | `onDelete: Restrict` | **Audit/Dedup:** Billing execution history must never be wiped |
| `Invoice` | `BillingCycleLog` | 1:1 (optional) | `BillingCycleLog.invoiceId` | `onDelete: Restrict` | Tracks exact invoice produced for each period |

### Payments & Multi-Payment Allocations
| Source Entity | Target Entity | Cardinality | Foreign Key | Cascade Rule | Business Justification |
|---|---|---|---|---|---|
| `CustomerProfile` | `Payment` | 1:N | `Payment.customerId` | `onDelete: Restrict` | Financial receipts cannot be deleted |
| `Payment` | `PaymentAllocation` | 1:N | `PaymentAllocation.paymentId` | `onDelete: Restrict` | Settlement allocations cannot be severed |
| `Invoice` | `PaymentAllocation` | 1:N | `PaymentAllocation.invoiceId` | `onDelete: Restrict` | Invoice payments remain permanently linked |
| `User` (Staff) | `Payment` | 1:N | `Payment.recordedById` | `onDelete: Restrict` | Accountability of staff member recording payment |

### Discounts
| Source Entity | Target Entity | Cardinality | Foreign Key | Cascade Rule | Business Justification |
|---|---|---|---|---|---|
| `DiscountRule` | `DiscountApplication` | 1:N | `DiscountApplication.discountRuleId` | `onDelete: Restrict` | Historical applications cannot be deleted |
| `DiscountRule` | `SubscriptionDiscount` | 1:N (optional) | `SubscriptionDiscount.discountRuleId` | `onDelete: SetNull` | Nullifies rule link if promo rule is deprecated |
| `Invoice` | `DiscountApplication` | 1:N | `DiscountApplication.invoiceId` | `onDelete: Restrict` | Deductions applied to invoice are permanent |
| `Product` | `DiscountRule` | 1:N (optional) | `DiscountRule.productId` | `onDelete: Restrict` | Target product cannot be removed while discount is active |

---

## 2. Integrity Summary
- **Zero Cascading Financial Deletion:** All financial transactions (invoices, payments, subscriptions, allocations, billing cycle logs) are protected with `onDelete: Restrict`.
- **Soft Deactivation:** `Product.isActive`, `SubscriptionPlan.isActive`, `DiscountRule.isActive`, `TaxRule.isActive` are used instead of physical deletes, ensuring backward compatibility with historical reporting.
