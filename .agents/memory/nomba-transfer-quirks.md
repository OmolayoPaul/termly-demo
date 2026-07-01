---
name: Nomba transfer API quirks
description: Correct scoping and field names for Nomba bank transfers and account lookup
---

## Rules

### accountId header scoping
- Auth (`/auth/token/issue`): use **PARENT_ACCOUNT_ID**
- Checkout, banks list, virtual accounts: use **SUB_ACCOUNT_ID**
- Bank transfer (`/transfers/bank`) and lookup (`/transfers/bank/lookup`): use **PARENT_ACCOUNT_ID**

**Why:** Sub-account returns `403 Forbidden` for outbound transfers even when the account appears to have permission. Parent-level header is required for debit operations.

### Transfer request body fields
- Field name is `merchantTxRef` (NOT `transactionReference` — that causes `"merchantTxRef must not be blank"`)
- Must include `sourceAccountId: SUB_ACCOUNT_ID` to tell Nomba which sub-account to debit
- Amount is in **naira** (not kobo)

**How to apply:** Every call to `transferToBank()` must use `transferHeaders()` (parent account) in the `fetch` call, and the JSON body must include `merchantTxRef` and `sourceAccountId`.

### Lookup
- `GET /transfers/bank/lookup?bankCode=<code>&accountNumber=<num>` also requires parent account header
- Returns `500 "An unexpected system error occurred"` for non-existent account numbers (not a code bug)
- Returns `404 "Account not found"` for valid-format but non-existent accounts

### Error response shapes
Nomba uses two different error formats:
1. `{ code, description, status }` — most errors
2. `{ errors: string[] }` — validation errors (e.g. missing required fields)

Parse both: `data.description || (Array.isArray(data.errors) ? data.errors.join('; ') : null)`
