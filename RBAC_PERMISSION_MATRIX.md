# Brightloop Subscription Management System — Role-Based Access Control (RBAC) Matrix

> **Document Version:** 1.0  
> **Source Principle:** Principle of Least Privilege (PoLP)  
> **Enforcement Points:** Backend Middleware (`requireRole`, `requirePermission`, `requireCustomerOwnership`) + Frontend Route Guards

---

## 1. Role Definitions

| Role | Target Persona | Scope of Authority |
|---|---|---|
| **`ADMIN`** | System Owner / Executive | Unrestricted system-wide control, staff provisioning, security configurations, tax & discount management, audit log access. |
| **`STAFF`** | Internal Operations Team | Day-to-day operational execution (creating quotations, viewing permitted subscriptions, recording approved payments). Zero staff provisioning or system-level configuration access. |
| **`CUSTOMER`** | External Subscribing Client | Self-service access strictly scoped to their own profile, quotations, contracts, invoices, and payments. Zero access to other accounts or operational catalogs. |

---

## 2. Centralized Permission Matrix

| Permission Identifier | Module | Description | `ADMIN` | `STAFF` | `CUSTOMER` |
|---|---|---|:---:|:---:|:---:|
| `users.read` | Users | View user accounts and profiles | ✅ | ✅ | ❌ |
| `users.manage` | Users | Modify user status, credentials, roles | ✅ | ❌ | ❌ |
| `staff.create` | Staff | Provision new Internal Staff accounts | ✅ | ❌ | ❌ |
| `staff.read` | Staff | View internal staff directory and departments | ✅ | ❌ | ❌ |
| `staff.update` | Staff | Update staff departmental details & titles | ✅ | ❌ | ❌ |
| `staff.deactivate` | Staff | Suspend or reactivate staff accounts | ✅ | ❌ | ❌ |
| `products.read` | Catalog | View software products, tiers, and add-ons | ✅ | ✅ | ✅ |
| `products.manage` | Catalog | Create, update, or deprecate products | ✅ | ❌ | ❌ |
| `plans.read` | Plans | View subscription plans and billing cycles | ✅ | ✅ | ✅ |
| `plans.manage` | Plans | Create, modify, or archive pricing plans | ✅ | ❌ | ❌ |
| `quotations.read` | Quotes | View generated quotations | ✅ | ✅ | ✅ *(Own only)* |
| `quotations.manage` | Quotes | Draft, edit, send, and convert quotes | ✅ | ✅ | ❌ |
| `subscriptions.read` | Contracts | View active, paused, or closed subscriptions | ✅ | ✅ | ✅ *(Own only)* |
| `subscriptions.manage` | Contracts | Pause, resume, close, or renew subscriptions | ✅ | ✅ | ❌ |
| `invoices.read` | Billing | View invoices and itemized lines | ✅ | ✅ | ✅ *(Own only)* |
| `invoices.manage` | Billing | Draft, issue, or cancel billing invoices | ✅ | ✅ | ❌ |
| `payments.read` | Payments | View recorded payments and allocations | ✅ | ✅ | ✅ *(Own only)* |
| `payments.manage` | Payments | Record manual payments, settle invoices | ✅ | ✅ | ❌ |
| `taxes.manage` | Finance | Configure legal tax rules and mappings | ✅ | ❌ | ❌ |
| `discounts.manage` | Finance | Create and configure discount rules | ✅ | ❌ | ❌ |
| `reports.read` | Analytics | Inspect MRR, ARR, churn, and revenue metrics | ✅ | ✅ | ❌ |
| `audit.read` | Security | Access immutable system audit logs | ✅ | ❌ | ❌ |
| `settings.manage` | System | Configure company defaults and security | ✅ | ❌ | ❌ |

---

## 3. Customer Data Ownership Enforcement

> [!IMPORTANT]
> **Hiding a button on the UI is NOT security.**  
> Brightloop enforces strict customer ownership at the Express controller and database query layer.

### Ownership Enforcement Mechanics:
1. When a `CUSTOMER` submits a request targeting a customer resource (e.g. `GET /api/v1/customers/:customerId/invoices`):
   - Middleware `requireCustomerOwnership('customerId')` intercepts the request.
   - It extracts the customer's authenticated `req.user.customerProfileId` and `req.user.id`.
   - If `:customerId` does not match the token's authenticated ID, the server rejects the request immediately with `HTTP 403 Forbidden`:
     ```json
     {
       "success": false,
       "statusCode": 403,
       "message": "Access forbidden: You cannot access or modify another customer's data"
     }
     ```
2. When an `ADMIN` or `STAFF` member invokes the same endpoint, ownership middleware bypasses the check, allowing authorized operational inspection.

---

## 4. Staff Security Boundaries

- Internal Staff accounts **cannot** provision or promote other staff accounts (`staff.create` is restricted to `ADMIN`).
- Internal Staff accounts **cannot** deactivate or reactivate accounts.
- Internal Staff accounts **cannot** modify tax rules (`taxes.manage`) or discount rules (`discounts.manage`).
- Public registration endpoints (`/api/v1/auth/register`) strictly hardcode `role: UserRole.CUSTOMER`. Any attempt to pass `role: 'ADMIN'` or `role: 'STAFF'` in the request body is stripped during Zod validation.
