# Local Testing

## Goal

Run the dedicated direct UPI processor flow on the local machine before pushing it into live web and APK builds.

## Files

- `pages/index.html`
- `pages/checkout.html`
- `pages/success.html`
- `pages/failed.html`
- `pages/pending.html`
- `shared/styles.css`
- `shared/entry.js`
- `shared/checkout.js`
- `shared/status.js`

## What this page tests

1. Create branded deposit session entry page
2. Open hosted-style checkout page
3. Open direct `upi://pay` or app-specific UPI intents
4. Report processor result through `POST /api/payments/upi-report`
5. Check current backend state through `GET /api/payments/upi-status`

## Recommended local flow

1. Start backend locally
2. Login from app or web and copy a valid bearer token
3. Open `pages/index.html` in a browser
4. Fill:
   - API Base URL
   - Bearer Token
   - UPI ID
   - Amount
5. Click `Go To Payment Page`
6. On checkout page, use:
   - `Deposit via UPI`
   - or `Google Pay`
   - or `PhonePe`
   - or `Paytm`
7. After returning, use advanced status actions if backend-connected testing is needed
8. Open success/failed/pending pages through checkout flow

## Notes

- This is for local processor testing only
- It does not give bank-trusted confirmation
- It is meant to validate Real Matka request creation, redirect, and backend status handling
- `local-processor.html` is still available as a legacy utility, but `pages/` is now the main dedicated flow
