# Brightloop Subscription Management System — Billing Frequency Rules & Calendar Mathematics

> **Engine:** `BillingFrequencyService` (`backend/src/modules/plans/billing-frequency.service.ts`)  
> **Source Requirements:** Original Problem Statement PDF (Page 3) & Master Prompt 06  
> **Accuracy Standard:** UTC Calendar-Aware Arithmetic (Zero Daylight Savings Time Shifts)  

---

## 1. Supported Billing Frequencies

The Brightloop recurring billing engine supports four mandatory billing frequencies:

| Frequency Enum | Base Interval | Interval Multiplier (`intervalCount`) | Practical Use Cases |
|---|---|---|---|
| `DAILY` | 1 Day | Yes (e.g. 1 = Daily, 3 = Every 3 Days) | High-frequency computing, daily cloud rentals |
| `WEEKLY` | 7 Days | Yes (e.g. 1 = Weekly, 2 = Bi-weekly) | Weekly service consulting, sprint-based subscriptions |
| `MONTHLY` | Calendar Month | Yes (e.g. 1 = Monthly, 3 = Quarterly, 6 = Semi-Annual) | Standard SaaS seats, workspace subscriptions |
| `YEARLY` | Calendar Year | Yes (e.g. 1 = Annually, 2 = Biennially) | Annual enterprise licenses, long-term contracts |

---

## 2. Calendar Arithmetic & Date Mathematics

### A. The Flaw of Simplistic Date Math
Simplistic subscription engines make fatal assumptions:
1. *Assuming 1 month = 30 days*: Causes billing dates to drift backwards by 5 to 6 days every year.
2. *Assuming 1 year = 365 days*: Fails during leap years, causing customer billing dates to advance out of sync.
3. *Local Timezone Arithmetic*: Day-light saving time (DST) shifts in spring/autumn cause dates to jump by hours, potentially duplicating or skipping invoices.

### B. The Brightloop Calendar-Aware Engine
Brightloop calculates recurring billing dates strictly using **UTC Calendar Mathematics**:
- All operations execute in Coordinated Universal Time (UTC) using `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`.
- Time-of-day (hours, minutes, seconds, milliseconds) is preserved with zero drift.
- Month-end boundaries and leap years are explicitly handled with clamping and anchor restoration.

---

## 3. Month-End Clamping & Anchor Day Restoration

When a subscription begins on the 31st of a month, subsequent months have varying day lengths:

### Rule 1: Clamping to Month Capacity
If the target month has fewer days than the anchor day, the next billing date clamps to the final day of that target month:
- **Jan 31, 2024** + 1 Month (Leap Year) $\rightarrow$ **Feb 29, 2024**
- **Jan 31, 2023** + 1 Month (Non-Leap Year) $\rightarrow$ **Feb 28, 2023**
- **March 31, 2026** + 1 Month $\rightarrow$ **April 30, 2026**

### Rule 2: Anchor Day Restoration
When billing cycles advance, Brightloop tracks the original subscription start day (`anchorDay`). If a cycle passes through a short month (e.g., February), subsequent months that have 31 days **restore the original 31st anchor**:
- Initial start: **Jan 31, 2023**
- Month 1 (Feb): **Feb 28, 2023** (clamped to 28)
- Month 2 (Mar): **March 31, 2023** (restored to 31!)
- Month 3 (Apr): **April 30, 2023** (clamped to 30)
- Month 4 (May): **May 31, 2023** (restored to 31!)

---

## 4. Leap Year Mathematics

Leap years occur:
- Every year evenly divisible by 4 (`year % 4 === 0`)
- **Except** century years, which are not leap years unless divisible by 400 (`year % 100 !== 0 || year % 400 === 0`)
- Examples: 2020, 2024, 2028 are leap years; 1900, 2100 are not; 2000 was a leap year.

### Feb 29 Subscription Rollover:
- A subscription created on **Feb 29, 2024** (Leap Year) billed **YEARLY**:
  - Year 1 (2025 - Non-Leap): **Feb 28, 2025**
  - Year 2 (2026 - Non-Leap): **Feb 28, 2026**
  - Year 3 (2027 - Non-Leap): **Feb 28, 2027**
  - Year 4 (2028 - Leap Year): **Feb 29, 2028** (Feb 29 preserved!)

---

## 5. Verification Test Matrix

All test cases are codified in `backend/tests/billing-frequency.test.ts` (100% Passing):

| Test Case | Frequency | Interval | Input Date | Expected Output Date | Result |
|---|---|---|---|---|---|
| Daily Interval | DAILY | 1 | 2026-01-15T10:00Z | 2026-01-16T10:00Z | **PASS** |
| Daily Multi-Step | DAILY | 5 | 2026-01-15T10:00Z | 2026-01-20T10:00Z | **PASS** |
| Weekly Interval | WEEKLY | 1 | 2026-03-01T12:00Z | 2026-03-08T12:00Z | **PASS** |
| Bi-Weekly Interval | WEEKLY | 2 | 2026-03-01T12:00Z | 2026-03-15T12:00Z | **PASS** |
| Jan 31 Non-Leap Feb | MONTHLY | 1 | 2023-01-31T00:00Z | 2023-02-28T00:00Z | **PASS** |
| Jan 31 Leap Feb | MONTHLY | 1 | 2024-01-31T00:00Z | 2024-02-29T00:00Z | **PASS** |
| Anchor 31 Restoration | MONTHLY | 1 | 2023-02-28 (Anchor 31) | 2023-03-31T00:00Z | **PASS** |
| Anchor 31 Apr Clamping | MONTHLY | 1 | 2023-03-31 (Anchor 31) | 2023-04-30T00:00Z | **PASS** |
| Quarterly Cadence | MONTHLY | 3 | 2026-01-10T00:00Z | 2026-04-10T00:00Z | **PASS** |
| Leap Year Feb 29 to Non-Leap | YEARLY | 1 | 2024-02-29T00:00Z | 2025-02-28T00:00Z | **PASS** |
| Leap Year Feb 29 to Next Leap | YEARLY | 4 | 2024-02-29T00:00Z | 2028-02-29T00:00Z | **PASS** |
| Negative Interval Guard | MONTHLY | -1 | Any | Throws positive integer error | **PASS** |
| Fractional Interval Guard | MONTHLY | 1.5 | Any | Throws positive integer error | **PASS** |
