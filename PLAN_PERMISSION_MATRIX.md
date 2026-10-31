# Brightloop Subscription Management System — Plan Permission Matrix & RBAC

> **Configuration Source:** `backend/src/config/permissions.ts`  
> **Enforcement Middleware:** `backend/src/middleware/authorize.ts` (`requireRole`, `requirePermission`)  
> **Principles:** Least Privilege, Defense-in-Depth, Backend Enforcement (Hiding UI controls is not security)  

---

## 1. Centralized Permission Registration

In Brightloop's centralized RBAC catalog (`backend/src/config/permissions.ts`), subscription plan operations are governed by two distinct atomic permissions:

1. **`plans.read`**: Authority to browse, search, inspect plan specifications, test order quantities, and simulate billing dates.
2. **`plans.manage`**: Authority to create plans, modify pricing, alter billing frequencies, change minimum quantities, set availability windows, configure auto/early closing, toggle pausing/renewal, and activate/deactivate/delete plans.

---

## 2. Role-to-Permission Mapping

| Permission | ADMIN | STAFF | CUSTOMER | Description |
|---|:---:|:---:|:---:|---|
| `plans.read` |  Granted |  Granted |  Granted (Scoped) | View subscription plans and billing specifications |
| `plans.manage` |  Granted | ❌ Denied | ❌ Denied | Create, edit, toggle status, and delete plans |

---

## 3. Protected Endpoint Authorization Matrix

| Endpoint | Method | Required Role | Required Permission | Behavior on Authorization Failure |
|---|---|---|---|---|
| `/api/v1/plans` | `GET` | Authenticated | `plans.read` | `401 Unauthorized` (if unauthenticated) |
| `/api/v1/plans/:id` | `GET` | Authenticated | `plans.read` | `401 Unauthorized` / `404 Not Found` (if customer requests inactive plan) |
| `/api/v1/plans/:id/validate-quantity` | `POST` | Authenticated | `plans.read` | `401 Unauthorized` |
| `/api/v1/plans/next-billing-date` | `POST` | Authenticated | Authenticated | `401 Unauthorized` |
| `/api/v1/plans` | `POST` | **ADMIN** | `plans.manage` | `403 Forbidden` (`Role '<ROLE>' is not authorized`) |
| `/api/v1/plans/:id` | `PATCH` | **ADMIN** | `plans.manage` | `403 Forbidden` |
| `/api/v1/plans/:id/status` | `PATCH` | **ADMIN** | `plans.manage` | `403 Forbidden` |
| `/api/v1/plans/:id` | `DELETE` | **ADMIN** | `plans.manage` | `403 Forbidden` |

---

## 4. Field-Level Visibility & Data Scope by Role

| Data Field / Capability | ADMIN | STAFF | CUSTOMER |
|---|:---:|:---:|:---:|
| Plan Name & Description | Visible & Editable | Visible (Read-Only) | Visible (Read-Only) |
| Public Recurring Price | Visible & Editable | Visible (Read-Only) | Visible (Read-Only) |
| Billing Frequency & Cadence | Visible & Editable | Visible (Read-Only) | Visible (Read-Only) |
| Minimum Order Quantity | Visible & Editable | Visible (Read-Only) | Visible (Read-Only) |
| Availability Dates (`availableFrom`, `availableUntil`) | Visible & Editable | Visible (Read-Only) | Visible (Active window only) |
| Inactive / Expired Plans | Full Access | Full Access | ❌ Blocked (Filtered from catalog) |
| Internal Subscription Count | Visible | Visible | ❌ Hidden |
| Associated Quotation Templates Count | Visible | Visible | ❌ Hidden |
| Auto-Close & Early-Close Configuration | Visible & Editable | Visible (Read-Only) | Visible (Read-Only terms) |
| Pause & Renewal Configuration | Visible & Editable | Visible (Read-Only) | Visible (Read-Only terms) |
| Associated Active Products | Visible & Editable | Visible (Read-Only) | Visible (Read-Only deliverables) |
