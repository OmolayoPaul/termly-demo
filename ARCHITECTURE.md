# Termly — Architecture & Security Note
## School Fee Collection, Payroll & Utility Payments
### Powered by Nomba

## OVERVIEW
Termly is a three-tier web application built with:
- Frontend: React (Vite) with Tailwind CSS
- Backend: Node.js with Express.js
- Database: localStorage (demo) / PostgreSQL (production)
- Hosting: Replit
- Payments: Nomba API (6 endpoints + webhooks)

## AUTHENTICATION
- JWT-based authentication (jsonwebtoken)
- Password hashing with bcrypt (saltRounds: 10)
- Role-based access control: Admin, Parent, Teacher, Student
- All credentials stored in Replit environment secrets
- Zero credentials exposed to frontend

## NOMBA INTEGRATION
1. Authentication API - auto-refresh token
2. Checkout Orders API - fee payment via hosted checkout
3. Bank Transfer API - payroll with account verification
4. Virtual Accounts API - persistent dedicated account per student
5. Direct Debit API - monthly installment mandates
6. Bills API - electricity token and data bundle purchase

All Nomba API calls are server-side only.
Live credentials active for final submission.

## WEBHOOKS
Endpoint: POST /api/webhooks/nomba
URL: https://termly-demo--glassnexusacade.replit.app/api/webhooks/nomba
Events: checkout.completed, transfer.success, 
transfer.failed, direct_debit.success
Security: HMAC SHA-256 signature verification

## SECURITY MEASURES
1. All credentials in Replit environment secrets only
2. Webhook HMAC SHA-256 signature verification
3. Rate limiting 100 requests per 15 minutes
4. Payment rate limiting 10 attempts per minute
5. Helmet.js HTTP security headers
6. JWT expiry on all protected routes
7. Role-based route protection
8. KYC BVN verification before payments enabled
9. No sensitive data in frontend code or GitHub

## DATA HANDLING
Demo: localStorage for rapid prototyping
Production: PostgreSQL with full schema designed

## VIRTUAL ACCOUNTS AS INFRASTRUCTURE
Each student receives a permanent named Nomba virtual 
account at registration. This eliminates manual payment 
reconciliation entirely.

## TRACKS COVERED
- Build Track Checkout and Recurring
- Build Track Virtual Accounts as Infrastructure
- Infrastructure Track: Subscriptions engine, 
  virtual account system, KYC-gated payment flow

## LIVE URLS
- App: https://termly-demo--glassnexusacade.replit.app
- Webhook: https://termly-demo--glassnexusacade.replit.app/api/webhooks/nomba

## DEVELOPER
- Name: Omolayo Paul Adeyemi
- Degree: First Class Computer Science TASUED 2025
- NYSC: IT Teacher Bimron Comprehensive College Lagos
- Company: Founder Glass Nexus Academy EdTech
