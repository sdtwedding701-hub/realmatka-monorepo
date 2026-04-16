# Payment System

Dedicated module workspace for the Real Matka direct UPI payment flow.

This folder is meant to keep the payment architecture, flow notes, API contracts,
and integration planning separate from the main app surfaces.

Current target:

- Direct UPI app launch flow
- Hosted checkout style multi-page processor
- Automatic app return detection where possible
- Backend-side payment status recording
- Wallet verification workflow
- Local standalone processor pages
- Reusable safe UPI redirect module

Main app areas that will integrate with this module:

- `/Backend`
- `/user apk`
- `/admin frontend`

Recommended next steps:

1. Finalize direct UPI flow rules
2. Define request/response contract for payment status
3. Decide automatic vs manual verification boundaries
4. Move reusable payment logic into dedicated helpers
5. Use `pages/index.html` and `pages/checkout.html` for hosted-style local flow validation
6. Integrate `src/upi.ts` and `src/processor.ts` into web and APK screens
