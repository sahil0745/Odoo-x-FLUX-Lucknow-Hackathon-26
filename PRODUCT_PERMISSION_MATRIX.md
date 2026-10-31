# Brightloop Subscription Management System — Product RBAC Permission Matrix

> **Document Version:** 1.0  
> **Source Principles:** Principle of Least Privilege (PoLP) & Multi-Tenant Data Isolation  
> **Enforcement Points:** Backend Express Middleware (`requireRole`, `requirePermission`) + React Route Guards

---

## 1. Product Permission Identifiers

| Permission Key | Description | `ADMIN` | `STAFF` | `CUSTOMER` |
|---|---|:---:|:---:|:---:|
| `products.read` | View product catalog, variant options, and calculate selling prices | ✅ | ✅ | ✅ |
| `products.manage` | Create, update, deactivate, delete products, and manage product variants | ✅ | ❌ | ❌ |

---

## 2. Field-Level Access Control (FLAC) Matrix

| Field | Description | `ADMIN` | `STAFF` | `CUSTOMER` |
|---|---|:---:|:---:|:---:|
| `id` | Product UUID | Visible | Visible | Visible |
| `name` | Commercial Product Name | Visible | Visible | Visible |
| `type` | `SOFTWARE`, `SERVICE`, `ADD_ON` | Visible | Visible | Visible |
| `salesPrice` | Catalog Base Selling Price | Visible | Visible | Visible |
| `costPrice` | Internal Supplier / Cost Price | Visible | **Hidden** ❌ | **Hidden** ❌ |
| `notes` | Internal Operational Notes | Visible | Visible | **Hidden** ❌ |
| `isActive` | Publication Status | Visible | Visible | Active Only |
| `variants` | Additive Surcharge Options | Visible | Visible | Visible |
| `variant.additionalPrice`| Additive Variant Surcharge | Visible | Visible | Visible |

### Backend Sanitization Mechanics:
The backend `ProductsService` implements strict field projection in `formatProduct`:
```typescript
if (userRole === 'ADMIN') {
  formatted.costPrice = product.costPrice.toFixed(2);
  formatted.notes = product.notes;
} else if (userRole === 'STAFF') {
  formatted.notes = product.notes;
  // costPrice is strictly omitted for STAFF
}
// CUSTOMER receives neither costPrice nor notes
```

---

## 3. Operation Permissions Summary

- **Product Creation:** `ADMIN` only.
- **Product Editing:** `ADMIN` only.
- **Product Status Toggle:** `ADMIN` only.
- **Product Deletion:** `ADMIN` only (subject to zero financial reference constraint).
- **Variant Creation/Editing/Deletion:** `ADMIN` only.
- **Price Calculation:** `ADMIN`, `STAFF`, `CUSTOMER`.
