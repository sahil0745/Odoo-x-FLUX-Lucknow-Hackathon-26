# Brightloop Subscription Management System — Authentication & Staff API Documentation

> **Base URL:** `/api/v1`  
> **Standard Request Headers:** `Content-Type: application/json`  
> **Standard Protected Headers:** `Authorization: Bearer <accessToken>`

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### 1.1 Customer Registration
- **Endpoint:** `POST /api/v1/auth/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "fullName": "Jane Doe",
    "email": "jane@company.com",
    "password": "SecurePassword2026!",
    "confirmPassword": "SecurePassword2026!",
    "companyName": "Acme Software Corp",
    "phone": "+1 555-0199"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Customer account registered successfully",
    "data": {
      "user": {
        "id": "b2f67a21-9988-43f1-b842-bc05ecb12345",
        "email": "jane@company.com",
        "role": "CUSTOMER",
        "customerProfile": {
          "id": "c9a1d442-8812-4cf0-a29e-bb9900112233",
          "contactName": "Jane Doe",
          "companyName": "Acme Software Corp"
        },
        "staffProfile": null
      },
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Set-Cookie Header:** `refreshToken=<token>; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`

---

### 1.2 User Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Access:** Public (Rate Limited: 10 requests / 15 minutes)
- **Request Body:**
  ```json
  {
    "email": "admin@brightloop.io",
    "password": "AdminSecurePassword2026!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Authenticated successfully",
    "data": {
      "user": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "email": "admin@brightloop.io",
        "role": "ADMIN",
        "customerProfile": null,
        "staffProfile": {
          "id": "s1t2a3f4-5678-90ab-cdef-1234567890ab",
          "department": "Executive",
          "title": "System Administrator"
        }
      },
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

---

### 1.3 Refresh Access Token
- **Endpoint:** `POST /api/v1/auth/refresh`
- **Access:** Public (Requires `refreshToken` in Cookie or Request Body)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Session token refreshed successfully",
    "data": {
      "user": { ... },
      "accessToken": "eyJhbGciOiJIUzI1Ni..."
    }
  }
  ```
- **Set-Cookie Header:** `refreshToken=<newRotatedToken>; HttpOnly; ...`

---

### 1.4 User Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Access:** Public (Reads cookie to revoke token)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```
- **Set-Cookie Header:** `refreshToken=; Max-Age=0; ...`

---

### 1.5 Forgot Password Request
- **Endpoint:** `POST /api/v1/auth/forgot-password`
- **Access:** Public (Rate Limited: 5 requests / hour)
- **Request Body:**
  ```json
  {
    "email": "user@brightloop.io"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "If an account exists with this email address, you will receive a password reset link shortly."
  }
  ```

---

### 1.6 Reset Password Confirmation
- **Endpoint:** `POST /api/v1/auth/reset-password`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "token": "4a7b9c2d1e0f...",
    "password": "NewCompliantPassword2026!",
    "confirmPassword": "NewCompliantPassword2026!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Your password has been successfully reset. You may now log in with your new credentials."
  }
  ```

---

### 1.7 Current Authenticated User Session
- **Endpoint:** `GET /api/v1/auth/me`
- **Access:** Authenticated (Bearer Token required)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "b2f67a21-9988-43f1-b842-bc05ecb12345",
      "email": "customer@brightloop.io",
      "role": "CUSTOMER",
      "permissions": [
        "products.read",
        "plans.read",
        "quotations.read",
        "subscriptions.read",
        "invoices.read",
        "payments.read"
      ],
      "customerProfile": {
        "id": "c9a1d442-8812-4cf0-a29e-bb9900112233",
        "contactName": "Jane Doe",
        "companyName": "Acme Corp"
      },
      "staffProfile": null,
      "createdAt": "2026-10-31T12:00:00.000Z"
    }
  }
  ```

---

## 2. Admin Staff Management Endpoints (`/api/v1/staff`)

> **All staff management endpoints strictly require:**
> - Header: `Authorization: Bearer <adminAccessToken>`
> - Account Role: `ADMIN`

### 2.1 Provision Internal Staff Member
- **Endpoint:** `POST /api/v1/staff`
- **Required Permission:** `staff.create`
- **Request Body:**
  ```json
  {
    "email": "operations@brightloop.io",
    "password": "StaffSecurePassword2026!",
    "department": "Billing Operations",
    "title": "Senior Operations Analyst"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Internal Staff account created successfully",
    "data": {
      "id": "d4e5f6a7-8901-2345-bcde-678901234567",
      "email": "operations@brightloop.io",
      "role": "STAFF",
      "isActive": true,
      "staffProfile": {
        "id": "p1q2r3s4-5678-90ab-cdef-1234567890ab",
        "department": "Billing Operations",
        "title": "Senior Operations Analyst",
        "createdById": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
      }
    }
  }
  ```

---

### 2.2 List Staff Directory
- **Endpoint:** `GET /api/v1/staff`
- **Required Permission:** `staff.read`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "d4e5f6a7-8901-2345-bcde-678901234567",
        "email": "operations@brightloop.io",
        "role": "STAFF",
        "isActive": true,
        "createdAt": "2026-10-31T12:00:00.000Z",
        "staffProfile": {
          "department": "Billing Operations",
          "title": "Senior Operations Analyst",
          "createdBy": {
            "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "email": "admin@brightloop.io"
          }
        }
      }
    ]
  }
  ```

---

### 2.3 Activate / Deactivate Staff Account
- **Endpoint:** `PATCH /api/v1/staff/:id/status`
- **Required Permission:** `staff.deactivate`
- **Request Body:**
  ```json
  {
    "isActive": false
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Staff account has been deactivated",
    "data": {
      "id": "d4e5f6a7-8901-2345-bcde-678901234567",
      "email": "operations@brightloop.io",
      "role": "STAFF",
      "isActive": false
    }
  }
  ```
