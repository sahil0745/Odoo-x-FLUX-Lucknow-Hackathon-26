# Brightloop Subscription Management System — Product API Specification

> **Base URL:** `/api/v1/products`  
> **Authentication:** Bearer Access Token (Header: `Authorization: Bearer <accessToken>`)  
> **Content-Type:** `application/json`

---

## 1. Endpoints Overview

| Method | Endpoint | Allowed Roles | Required Permission | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/products` | `ADMIN`, `STAFF`, `CUSTOMER` | `products.read` | List products with pagination, search, and role sanitization. |
| `GET` | `/api/v1/products/:id` | `ADMIN`, `STAFF`, `CUSTOMER` | `products.read` | Retrieve single product details and active variants. |
| `POST` | `/api/v1/products/:id/calculate-price` | `ADMIN`, `STAFF`, `CUSTOMER` | `products.read` | Calculate exact price with selected variant add-ons. |
| `POST` | `/api/v1/products/calculate-price` | `ADMIN`, `STAFF`, `CUSTOMER` | `products.read` | Alternative price calculation endpoint accepting `productId`. |
| `POST` | `/api/v1/products` | `ADMIN` Only | `products.manage` | Create new product with optional initial variants. |
| `PATCH` | `/api/v1/products/:id` | `ADMIN` Only | `products.manage` | Update product attributes. |
| `PATCH` | `/api/v1/products/:id/status` | `ADMIN` Only | `products.manage` | Toggle product `isActive` status. |
| `DELETE` | `/api/v1/products/:id` | `ADMIN` Only | `products.manage` | Safe deletion with historical transaction reference guard. |
| `POST` | `/api/v1/products/:id/variants` | `ADMIN` Only | `products.manage` | Add a new variant to a product. |
| `PATCH` | `/api/v1/products/:id/variants/:variantId` | `ADMIN` Only | `products.manage` | Update a specific product variant. |
| `DELETE` | `/api/v1/products/:id/variants/:variantId` | `ADMIN` Only | `products.manage` | Delete an unreferenced product variant. |

---

## 2. Detailed Endpoint Specifications

### A. List Products
**`GET /api/v1/products`**

**Query Parameters:**
- `page` (integer, optional, default: `1`): Current page.
- `limit` (integer, optional, default: `20`, max: `100`): Results per page.
- `search` (string, optional): Case-insensitive search on product name and internal notes.
- `type` (string, optional): Filter by `SOFTWARE`, `SERVICE`, or `ADD_ON`.
- `isActive` (boolean string, optional): `true` or `false`. (Customers always see `isActive=true`).
- `sortBy` (string, optional, default: `createdAt`): `name`, `salesPrice`, `createdAt`, `type`.
- `sortOrder` (string, optional, default: `desc`): `asc` or `desc`.

**Role-Based Response Sanitization:**
- **`ADMIN`:** Returns all fields, including `costPrice` and `notes`.
- **`STAFF`:** Returns `notes`, but `costPrice` is omitted.
- **`CUSTOMER`:** Both `costPrice` and `notes` are strictly omitted.

**Success Response (HTTP 200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "e290fbb6-46b3-469b-8d19-450f28a7e001",
      "name": "Odoo ERP Core Platform",
      "type": "SOFTWARE",
      "salesPrice": "1000.00",
      "costPrice": "450.00",
      "notes": "Core enterprise ERP system",
      "isActive": true,
      "variantCount": 2,
      "variants": [
        {
          "id": "85e92be1-d24e-48a0-9c29-873b22a0e002",
          "productId": "e290fbb6-46b3-469b-8d19-450f28a7e001",
          "variantType": "Brand",
          "variantValue": "Odoo Enterprise Upgrade",
          "additionalPrice": "560.00",
          "isActive": true
        }
      ],
      "createdAt": "2026-10-31T09:00:00.000Z",
      "updatedAt": "2026-10-31T09:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### B. Create Product
**`POST /api/v1/products`**  
*(Admin Only)*

**Request Body:**
```json
{
  "name": "Odoo ERP Core Platform",
  "type": "SOFTWARE",
  "salesPrice": "1000.00",
  "costPrice": "450.00",
  "notes": "Includes 12 months maintenance",
  "isActive": true,
  "variants": [
    {
      "variantType": "Brand",
      "variantValue": "Odoo Enterprise Upgrade",
      "additionalPrice": "560.00"
    }
  ]
}
```

**Success Response (HTTP 201 Created):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "e290fbb6-46b3-469b-8d19-450f28a7e001",
    "name": "Odoo ERP Core Platform",
    "type": "SOFTWARE",
    "salesPrice": "1000.00",
    "costPrice": "450.00",
    "notes": "Includes 12 months maintenance",
    "isActive": true,
    "variantCount": 1,
    "variants": [
      {
        "id": "85e92be1-d24e-48a0-9c29-873b22a0e002",
        "productId": "e290fbb6-46b3-469b-8d19-450f28a7e001",
        "variantType": "Brand",
        "variantValue": "Odoo Enterprise Upgrade",
        "additionalPrice": "560.00",
        "isActive": true
      }
    ],
    "createdAt": "2026-10-31T09:00:00.000Z",
    "updatedAt": "2026-10-31T09:00:00.000Z"
  }
}
```

---

### C. Calculate Product Price with Variants
**`POST /api/v1/products/:id/calculate-price`**

**Request Body:**
```json
{
  "selectedVariantIds": [
    "85e92be1-d24e-48a0-9c29-873b22a0e002"
  ]
}
```

**Success Response (HTTP 200 OK):**
```json
{
  "success": true,
  "data": {
    "productId": "e290fbb6-46b3-469b-8d19-450f28a7e001",
    "productName": "Odoo ERP Core Platform",
    "baseSalesPrice": "1000.00",
    "selectedVariants": [
      {
        "variantId": "85e92be1-d24e-48a0-9c29-873b22a0e002",
        "variantType": "Brand",
        "variantValue": "Odoo Enterprise Upgrade",
        "additionalPrice": "560.00"
      }
    ],
    "totalVariantAdditions": "560.00",
    "finalPrice": "1560.00",
    "currency": "USD"
  }
}
```

---

### D. Delete / Archive Product
**`DELETE /api/v1/products/:id`**  
*(Admin Only)*

**Rejection when referenced by financial records (HTTP 409 Conflict):**
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Cannot delete product 'Odoo ERP Core Platform': It is referenced by 5 existing historical records (quotations, subscriptions, or invoices). Please deactivate the product instead to preserve historical audit integrity."
}
```

**Successful deletion when unreferenced (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Product 'Unused Product' was successfully deleted"
}
```
