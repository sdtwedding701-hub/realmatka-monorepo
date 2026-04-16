# Direct UPI Flow

## Goal

Provide a dedicated payment system for wallet deposits using direct UPI app flow.

## Planned user flow

1. User opens Add Fund
2. Amount is entered once
3. Processor page opens
4. UPI app is launched
5. App/browser return is detected
6. Payment status is captured
7. Backend stores payment result
8. Wallet history shows status

## Status model

- `INITIATED`
- `SUCCESS`
- `FAILED`
- `CANCELLED`

## Important limitation

Direct UPI app return is not a bank-trusted confirmation layer.
Client-side success detection can be attempted, but it is not equivalent to a
server webhook or banking verification system.

## Current Real Matka direction

- Keep a processor-style screen
- Prefer direct UPI open from that screen
- Record payment outcome into backend
- Keep admin visibility for payment review
- Treat UTR as optional debug metadata, not a hard blocker
