# Brightloop Subscription Management System — Subscription Plan API Documentation

> **Base URL:** `/api/v1/plans`  
> **Authentication:** Bearer JWT Access Token (Header: `Authorization: Bearer <token>`)  
> **Response Format:** JSON (Consistent envelope: `{ success: boolean, message?: string, data?: any }`)  
> **Error Format:** `{ success: false, statusCode: number, message: string, details?: any }`  

---

## Endpoint Summary

| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/plans` | **ADMIN** (`plans.manage`) | Create a new subscription plan with cadence and rules |
| `GET` | `/api/v1/plans` | **ADMIN**, **STAFF**, **CUSTOMER** (`plans.read`) | List plans with pagination, search, and filters |
| `GET` | `/api/v1/plans/:id` | **ADMIN**, **STAFF**, **CUSTOMER** (`plans.read`) | Retrieve complete specifications of a single plan |
| `PATCH` | `/api/v1/plans/:id` | **ADMIN** (`plans.manage`) | Update plan details, pricing, availability, and lifecycle rules |
| `PATCH` | `/api/v1/plans/:id/status` | **ADMIN** (`plans.manage`) | Safely activate or deactivate plan |
| `DELETE` | `/api/v1/plans/:id` | **ADMIN** (`plans.manage`) | Delete unreferenced plan (blocked if referenced) |
| `POST` | `/api/v1/plans/:id/validate-quantity` | **ADMIN**, **STAFF**, **CUSTOMER** (`plans.read`) | Validate requested order quantity against minimum requirement |
| `POST` | `/api/v1/plans/next-billing-date` | Authenticated Users | Utility: calculate next recurring billing date and cycle |

---

## 1. Create Subscription Plan

- **Method:** `POST`
- **Route:** `/api/v1/plans`
- **Headers:** `Authorization: Bearer <ADMIN_JWT>`
- **Permissions Required:** `plans.manage`

### Request Body:

```json
{
  "name": "Cloud Pro SaaS",
  "description": "Multi-user cloud workspace for fast-growing companies",
  "price": "199.99",
  "billingFrequency": "MONTHLY",
  "intervalCount": 1,
  "minimumQuantity": 5,
  "availableFrom": "2026-01-01T00:00:00.000Z",
  "availableUntil": "2026-12-31T23:59:59.000Z",
  "allowAutoClose": false,
  "allowEarlyClose": true,
  "allowPause": true,
  "allowRenewal": true,
  "isActive": true,
  "associatedProductIds": ["00000000-0000-0000-0000-000000000001"]
}
```

### Success Response (`201 Created`):

```json
{
  "success": true,
  "message": "Subscription plan created successfully",
  "data": {
    "plan": {
      "id": "e3f19e48-8422-4820-94cb-fa738221adbc",
      "name": "Cloud Pro SaaS",
      "description": "Multi-user cloud workspace for fast-growing companies",
      "price": "199.99",
      "billingFrequency": "MONTHLY",
      "intervalCount": 1,
      "minimumQuantity": 5,
      "availableFrom": "2026-01-01T00:00:00.000Z",
      "availableUntil": "2026-12-31T23:59:59.000Z",
      "allowAutoClose": false,
      "allowEarlyClose": true,
      "allowPause": true,
      "allowRenewal": true,
      "isActive": true,
      "currency": "USD",
      "cadenceFormatted": "USD 199.99 / Monthly",
      "availabilityStatus": "ACTIVE",
      "isAvailable": true,
      "createdAt": "2026-10-31T15:00:00.000Z",
      "updatedAt": "2026-10-31T15:00:00.000Z"
    }
  }
}
```

---

## 2. List Subscription Plans

- **Method:** `GET`
- **Route:** `/api/v1/plans`
- **Headers:** `Authorization: Bearer <JWT>`
- **Permissions Required:** `plans.read`

### Query Parameters:

| Param | Type | Options | Default | Description |
|---|---|---|---|---|
| `page` | integer | `>= 1` | `1` | Page number |
| `limit` | integer | `1 - 100` | `10` | Page size limit |
| `search` | string | any | — | Matches plan name or description |
| `billingFrequency` | string | `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` | — | Filter by cadence |
| `isActive` | boolean | `true`, `false`, `all` | — | Filter by active state (Admin/Staff only) |
| `availability` | string | `all`, `available`, `upcoming`, `expired` | `all` | Availability window filter |
| `sortBy` | string | `name`, `price`, `createdAt`, `billingFrequency`, `minimumQuantity` | `createdAt` | Sort column |
| `sortOrder` | string | `asc`, `desc` | `desc` | Sort direction |

*Note for CUSTOMER role:* Query results are automatically forced to `isActive: true` and within current availability dates (`availableFrom <= now` and `availableUntil >= now`).

---

## 3. Get Plan By ID

- **Method:** `GET`
- **Route:** `/api/v1/plans/:id`
- **Headers:** `Authorization: Bearer <JWT>`
- **Permissions Required:** `plans.read`

### Success Response (`200 OK`):

```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "e3f19e48-8422-4820-94cb-fa738221adbc",
      "name": "Cloud Pro SaaS",
      "price": "199.99",
      "billingFrequency": "MONTHLY",
      "intervalCount": 1,
      "minimumQuantity": 5,
      "availableFrom": "2026-01-01T00:00:00.000Z",
      "availableUntil": "2026-12-31T23:59:59.000Z",
      "allowAutoClose": false,
      "allowEarlyClose": true,
      "allowPause": true,
      "allowRenewal": true,
      "isActive": true,
      "currency": "USD",
      "cadenceFormatted": "USD 199.99 / Monthly",
      "availabilityStatus": "ACTIVE",
      "isAvailable": true,
      "activeSubscriptionCount": 12,
      "associatedProducts": [
        {
          "id": "00000000-0000-0000-0000-000000000001",
          "name": "Brightloop Workspace Core",
          "type": "SOFTWARE",
          "salesPrice": "1000.00"
        }
      ]
    }
  }
}
```

---

## 4. Update Subscription Plan

- **Method:** `PATCH`
- **Route:** `/api/v1/plans/:id`
- **Headers:** `Authorization: Bearer <ADMIN_JWT>`
- **Permissions Required:** `plans.manage`

### Request Body (Partial):

```json
{
  "price": "249.99",
  "minimumQuantity": 10,
  "allowPause": false
}
```

*Note on Historical Snapshots:* Modifying `price` on a plan does **not** alter prices on existing active subscriptions, past invoices, or accepted quotation snapshots.

---

## 5. Activate / Deactivate Plan

- **Method:** `PATCH`
- **Route:** `/api/v1/plans/:id/status`
- **Headers:** `Authorization: Bearer <ADMIN_JWT>`
- **Permissions Required:** `plans.manage`

### Request Body:

```json
{
  "isActive": false
}
```

---

## 6. Delete Subscription Plan

- **Method:** `DELETE`
- **Route:** `/api/v1/plans/:id`
- **Headers:** `Authorization: Bearer <ADMIN_JWT>`
- **Permissions Required:** `plans.manage`

### Blocked Response When Referenced (`409 Conflict`):

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Cannot delete subscription plan 'Cloud Pro SaaS' because it is referenced by existing business records (3 subscriptions, 5 quotations, 1 templates). Please deactivate the plan instead."
}
```

---

## 7. Validate Order Quantity

- **Method:** `POST`
- **Route:** `/api/v1/plans/:id/validate-quantity`
- **Headers:** `Authorization: Bearer <JWT>`
- **Permissions Required:** `plans.read`

### Request Body:

```json
{
  "quantity": 3
}
```

### Response (`200 OK` - Invalid Quantity Below Minimum):

```json
{
  "success": true,
  "data": {
    "validation": {
      "isValid": false,
      "error": "Requested quantity (3) is below the plan minimum required quantity (5).",
      "requestedQuantity": 3,
      "minimumQuantity": 5
    }
  }
}
```

---

## 8. Next Billing Date Simulator

- **Method:** `POST`
- **Route:** `/api/v1/plans/next-billing-date`
- **Headers:** `Authorization: Bearer <JWT>`

### Request Body:

```json
{
  "startDate": "2026-01-31T00:00:00.000Z",
  "billingFrequency": "MONTHLY",
  "intervalCount": 1
}
```

### Success Response (`200 OK`):

```json
{
  "success": true,
  "data": {
    "periodStart": "2026-01-31T00:00:00.000Z",
    "periodEnd": "2026-02-28T00:00:00.000Z",
    "nextBillingDate": "2026-02-28T00:00:00.000Z"
  }
}
```
