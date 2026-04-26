import { applyFirstDepositBonusIfEligible, findUserByPhone, __internalGetPgPool, __internalGetSqlite } from "../db.mjs";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

async function findDepositByGatewayPaymentId(gatewayPaymentId) {
  const pool = __internalGetPgPool();
  if (pool) {
    const result = await pool.query(
      `SELECT user_id, amount, reference_id, status
       FROM wallet_entries
       WHERE type = 'DEPOSIT' AND reference_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [gatewayPaymentId]
    );
    return result.rows[0]
      ? {
          userId: String(result.rows[0].user_id),
          amount: Number(result.rows[0].amount),
          referenceId: String(result.rows[0].reference_id || ""),
          status: String(result.rows[0].status || "")
        }
      : null;
  }

  const row = __internalGetSqlite()
    .prepare(
      `SELECT user_id, amount, reference_id, status
       FROM wallet_entries
       WHERE type = 'DEPOSIT' AND reference_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1`
    )
    .get(gatewayPaymentId);

  return row
    ? {
        userId: String(row.user_id),
        amount: Number(row.amount),
        referenceId: String(row.reference_id || ""),
        status: String(row.status || "")
      }
    : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const phone = String(args.phone || "").trim();
  const paymentId = String(args.paymentId || "").trim();

  if (!phone || !paymentId) {
    fail("Usage: node ops/fix-missing-first-deposit-bonus.mjs --phone 9494351008 --paymentId pay_xxx");
  }

  const user = await findUserByPhone(phone);
  if (!user) {
    fail(`User not found for phone ${phone}`);
  }

  const deposit = await findDepositByGatewayPaymentId(paymentId);
  if (!deposit) {
    fail(`Deposit wallet entry not found for payment ${paymentId}`);
  }

  if (deposit.userId !== user.id) {
    fail(`Deposit user mismatch. Expected ${user.id}, found ${deposit.userId}`);
  }

  if (deposit.status !== "SUCCESS") {
    fail(`Deposit status is ${deposit.status}. Bonus can only be applied on successful deposits.`);
  }

  const bonusEntry = await applyFirstDepositBonusIfEligible({
    userId: user.id,
    depositAmount: deposit.amount,
    depositEntryId: paymentId
  });

  if (!bonusEntry) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          applied: false,
          message: "Bonus not applied. It may already be granted or the user is no longer eligible."
        },
        null,
        2
      )
    );
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        applied: true,
        userId: user.id,
        phone,
        paymentId,
        bonusEntry: {
          id: bonusEntry.id,
          type: bonusEntry.type,
          amount: bonusEntry.amount,
          referenceId: bonusEntry.referenceId,
          createdAt: bonusEntry.createdAt
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  fail(error?.message || String(error));
});
