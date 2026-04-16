# Payment API Contract

## Start deposit

Endpoint:

- `POST /api/payments/upi-start`

Suggested request:

```json
{
  "amount": 100,
  "referenceId": "RM12345678AB",
  "appName": "DIRECT_UPI"
}
```

Suggested response:

```json
{
  "ok": true,
  "data": {
    "id": "wallet_entry_id",
    "type": "DEPOSIT",
    "status": "INITIATED",
    "amount": 100
  }
}
```

## Report deposit status

Endpoint:

- `POST /api/payments/upi-report`

Suggested request:

```json
{
  "referenceId": "RM12345678AB",
  "appName": "DIRECT_UPI",
  "appReportedStatus": "SUCCESS",
  "rawResponse": "",
  "utr": "optional-ref"
}
```

Possible statuses:

- `SUCCESS`
- `FAILED`
- `CANCELLED`

## Notes

- This contract is for dedicated direct UPI flow only
- `utr` is optional and can be attached when available
- Future bank/PSP verification can extend this contract
