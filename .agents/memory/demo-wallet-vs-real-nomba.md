---
name: Demo wallet vs real Nomba API scope
description: Which payment/transfer flows must stay on the simulated demo wallet vs which still call the real Nomba API
---

The live Nomba account used by this project is unpermissioned/broken for outbound transfers ("Transfer not permitted. Check that your Nomba account has outbound transfers enabled.", "Record not found."). Any UI flow that calls the real Nomba service functions in `src/services/nomba.ts` (checkout, direct-debit mandates, bank transfers, virtual accounts, electricity/data bills) will surface these errors to users.

**Rule:** All parent-facing payment and savings flows must go through the demo simulation in `src/lib/demoWallet.ts` (`demoPayFee`, `demoTopUpSavings`, `demoDeductSavings`, `demoCreateMandate`, etc.) plus `src/components/DemoPaymentModal.tsx` for the UI — never the real Nomba API.

**Why:** The parent-facing app is a demo/pitch product; the real Nomba merchant account isn't approved for live transfers yet. Wiring parent payments to the real API produces hard failures with no working fallback (no real bank rails behind it).

**How to apply:** Before adding or modifying any parent payment/savings/installment feature, check whether it imports from `../services/nomba` — if so, replace with the matching `demoWallet.ts` function. As of this writing, `admin.payroll.tsx` (salary disbursement via `transferToBank`) and `admin.bills.tsx` (electricity/data bundle payments) still call the real Nomba API — these are staff-facing, not part of the original bug report, but would hit the same permission errors if exercised. Confirm with the user before deciding whether those also need demo conversion.
