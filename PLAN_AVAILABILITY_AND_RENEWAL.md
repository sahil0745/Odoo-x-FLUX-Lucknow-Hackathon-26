# Brightloop Subscription Management System — Plan Availability, Closing & Renewal Architecture

> **Service Engine:** `PlanAvailabilityService` (`backend/src/modules/plans/plan-availability.service.ts`)  
> **Source Requirements:** Original Problem Statement PDF (Page 3) & Master Prompt 06  
> **Scope Boundary:** Plan-level policy definition and pre-flight validation (Subscription lifecycle execution deferred to subsequent module)  

---

## 1. Distinction: Plan Availability vs. Subscription Lifecycle

A fundamental architectural distinction in Brightloop is the separation of **Plan Availability** from **Subscription Lifecycle**:

| Dimension | Plan Availability (Module M03 - Implemented Now) | Subscription Lifecycle (Module M05 - Future Stage) |
|---|---|---|
| **Subject** | The catalog blueprint (`SubscriptionPlan`) | An individual customer's contracted agreement (`Subscription`) |
| **Focus** | When can this plan be selected to create new subscriptions or quotation drafts? | What happens to active recurring billing when an enrolled subscription reaches renewal or term expiration? |
| **Trigger** | Catalog browsing, sales quotation generation, order quantity check | Scheduled billing cron, customer manual pause, cancellation request |
| **Impact of Deactivation** | Inactive plans cannot be selected for new orders | Existing active subscriptions continue unaffected until their natural term concludes |

---

## 2. Plan Availability Status Matrix

A plan's availability status is determined dynamically by `PlanAvailabilityService.checkPlanAvailability`:

| Availability Status | Condition | Can Be Selected for New Orders? | Reason Returned to Client |
|---|---|---|---|
| `ACTIVE` | `isActive === true` AND `now >= availableFrom` AND (`availableUntil == null || now <= availableUntil`) | **Yes** | Plan is available and open for subscription. |
| `UPCOMING` | `isActive === true` AND `now < availableFrom` | **No** | Plan is not yet available. Availability begins on `<availableFrom>`. |
| `EXPIRED` | `isActive === true` AND `now > availableUntil` | **No** | Plan has passed its availability window. It expired on `<availableUntil>`. |
| `INACTIVE` | `isActive === false` | **No** | Plan has been deactivated by an administrator and cannot be selected. |

### Date Window Guardrail:
When creating or updating plans, the backend enforces:
$$\text{availableUntil} \ge \text{availableFrom}$$
If $\text{availableUntil} < \text{availableFrom}$, the request is rejected with `ValidationError: Availability end date cannot precede start date`.

---

## 3. Closing Configuration Rules

The PDF explicitly requires plans to support **automatic closing** and **early closing**:

### A. Automatic Closing (`allowAutoClose: Boolean`, default `false`)
- **Plan-Level Setting**: Determines whether customer subscriptions created under this plan should automatically transition to `CLOSED` status once their contract expiration date is reached.
- **When `true`**: The future subscription scheduler will close the subscription automatically upon expiration without requiring manual administrator intervention.
- **When `false`**: The subscription requires explicit administrative review or customer renewal action.

### B. Early Closing (`allowEarlyClose: Boolean`, default `true`)
- **Plan-Level Setting**: Determines whether customers or operational staff are permitted to terminate a subscription prior to its scheduled cycle end date.
- **When `true`**: Early termination actions are permitted.
- **When `false`**: Contractual commitment requires fulfillment of the full term.

---

## 4. Pause & Renewal Configuration Rules

The PDF requires plans to support **pausing** and **renewal options**:

### A. Plan Pausing (`allowPause: Boolean`, default `false`)
- **Plan-Level Setting**: Declares whether subscribers have the self-service or staff-assisted privilege to temporarily suspend recurring billing and service delivery.
- **When `true`**: Subscribers can trigger pause mode during active terms.
- **When `false`**: Pausing is disallowed; subscriptions remain active or must be formally cancelled.

### B. Renewal Options (`allowRenewal: Boolean`, default `true`)
- **Plan-Level Setting**: Governs whether subscriptions created under this plan are eligible for automatic renewal cycles.
- **When `true`**: Upon reaching the cycle end date, the recurring billing engine automatically generates the next invoice and advances `nextBillingDate`.
- **When `false`**: The subscription terminates at the conclusion of its single contracted term.

---

## 5. Security & RBAC Enforcement

1. **Staff & Customer Restrictions**:
   - Only users with role `ADMIN` (`plans.manage` permission) are authorized to alter closing, pause, renewal, and availability date configurations.
   - Any attempt by `STAFF` or `CUSTOMER` to mutate these flags via `POST /api/v1/plans` or `PATCH /api/v1/plans/:id` is blocked with HTTP `403 Forbidden`.
2. **Customer Visibility**:
   - Customers browsing plans only see plans in `ACTIVE` state.
   - Inactive or expired plans return `404 Not Found` to customers, preventing exposure of internal product strategies.
