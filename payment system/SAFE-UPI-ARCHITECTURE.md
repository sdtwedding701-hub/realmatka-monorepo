# Safe UPI Architecture

## Goal

Create a dedicated payment system that feels safer and more standards-compliant for UPI apps, instead of scattering redirect logic directly across app screens.

## What "safe" means here

- Use a minimal, standards-oriented UPI payload
- Keep one processor layer responsible for redirects
- Use app-specific intent packages when possible
- Keep a generic fallback URL
- Record backend payment state consistently
- Never assume client-side success means bank-confirmed success

## Recommended flow

1. Wallet screen creates deposit session
2. Payment processor module builds:
   - generic `upi://pay`
   - app-specific intent URL
3. Preferred target is launched:
   - Google Pay
   - PhonePe
   - Paytm
   - Generic fallback
4. On app return:
   - move local state to `RETURNED_FROM_APP`
   - submit `SUBMITTED` to backend
5. Wallet history shows latest deposit state

## Current module files

- `src/types.ts`
- `src/upi.ts`
- `src/processor.ts`

## Why this is better than scattered redirects

- Same UPI payload rules everywhere
- Same target packages everywhere
- Easier debugging when a PSP rejects one launch path
- Cleaner future migration to QR or PSP if needed

## Important limit

This module can make the redirect flow cleaner and more standards-compliant, but it cannot force Google Pay or PhonePe to trust a receiver VPA beyond their own rules.

