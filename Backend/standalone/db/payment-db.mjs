import {
  __internalGetPgPool,
  __internalGetSqlite,
  __internalNowIso
} from "../db.mjs";

function mapPaymentOrderRow(row) {
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        provider: row.provider,
        amount: Number(row.amount),
        status: row.status,
        reference: row.reference,
        checkoutToken: row.checkout_token ?? null,
        gatewayOrderId: row.gateway_order_id ?? null,
        gatewayPaymentId: row.gateway_payment_id ?? null,
        gatewaySignature: row.gateway_signature ?? null,
        verifiedAt: row.verified_at ? String(row.verified_at) : null,
        redirectUrl: row.redirect_url ?? null,
        createdAt: row.created_at ? String(row.created_at) : null,
        updatedAt: row.updated_at ? String(row.updated_at) : null
      }
    : null;
}

async function findPaymentOrderById(paymentOrderId) {
  const pool = __internalGetPgPool();
  if (pool) {
    const result = await pool.query(
      `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
       FROM payment_orders
       WHERE id = $1
       LIMIT 1`,
      [paymentOrderId]
    );
    return mapPaymentOrderRow(result.rows[0]);
  }

  return mapPaymentOrderRow(
    __internalGetSqlite()
      .prepare(
        `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
         FROM payment_orders
         WHERE id = ?
         LIMIT 1`
      )
      .get(paymentOrderId)
  );
}

async function findPaymentOrderByReference(reference) {
  if (!reference) {
    return null;
  }

  const pool = __internalGetPgPool();
  if (pool) {
    const result = await pool.query(
      `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
       FROM payment_orders
       WHERE reference = $1
       LIMIT 1`,
      [reference]
    );
    return mapPaymentOrderRow(result.rows[0]);
  }

  return mapPaymentOrderRow(
    __internalGetSqlite()
      .prepare(
        `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
         FROM payment_orders
         WHERE reference = ?
         LIMIT 1`
      )
      .get(reference)
  );
}

export async function findPaymentOrderByReferenceForUser(userId, reference) {
  const order = await findPaymentOrderByReference(reference);
  if (!order || order.userId !== userId) {
    return null;
  }
  return order;
}

export async function findPaymentOrderForCheckout(paymentOrderId, checkoutToken) {
  const order = await findPaymentOrderById(paymentOrderId);
  if (!order || !checkoutToken || order.checkoutToken !== checkoutToken) {
    return null;
  }
  return order;
}

export async function createPaymentOrder({
  id = `payment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  userId,
  amount,
  provider = "manual",
  reference = `RM${Date.now()}`,
  checkoutToken = null,
  gatewayOrderId = null,
  redirectUrl = null
}) {
  const createdAt = __internalNowIso();
  const status = "PENDING";
  const pool = __internalGetPgPool();

  if (pool) {
    await pool.query(
      `INSERT INTO payment_orders (id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, redirect_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
      [id, userId, provider, amount, status, reference, checkoutToken, gatewayOrderId, redirectUrl, createdAt]
    );
  } else {
    __internalGetSqlite()
      .prepare(
        `INSERT INTO payment_orders (id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, redirect_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, userId, provider, amount, status, reference, checkoutToken, gatewayOrderId, redirectUrl, createdAt, createdAt);
  }

  return findPaymentOrderById(id);
}

export async function completePaymentOrder({ paymentOrderId, gatewayOrderId, gatewayPaymentId, gatewaySignature }) {
  const verifiedAt = __internalNowIso();
  const pool = __internalGetPgPool();

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existingResult = await client.query(
        `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
         FROM payment_orders
         WHERE id = $1
         FOR UPDATE`,
        [paymentOrderId]
      );
      const existing = existingResult.rows[0];
      if (!existing) {
        await client.query("ROLLBACK");
        return null;
      }
      if (existing.gateway_order_id && existing.gateway_order_id !== gatewayOrderId) {
        throw new Error("Gateway order mismatch");
      }
      if (existing.status !== "SUCCESS") {
        const currentBalance = Number(
          (
            await client.query(
              `SELECT COALESCE(
                 (
                   SELECT after_balance
                   FROM wallet_entries
                   WHERE user_id = $1
                   ORDER BY created_at DESC, id DESC
                   LIMIT 1
                 ),
                 0
               ) AS balance`,
              [existing.user_id]
            )
          ).rows[0]?.balance ?? 0
        );
        const nextBalance = currentBalance + Number(existing.amount);
        await client.query(
          `UPDATE payment_orders
           SET status = 'SUCCESS',
               gateway_order_id = $2,
               gateway_payment_id = $3,
               gateway_signature = $4,
               verified_at = $5,
               updated_at = $5
           WHERE id = $1`,
          [paymentOrderId, gatewayOrderId, gatewayPaymentId, gatewaySignature, verifiedAt]
        );
        await client.query(
          `INSERT INTO wallet_entries (id, user_id, type, status, amount, before_balance, after_balance, reference_id, note, created_at)
           VALUES ($1, $2, 'DEPOSIT', 'SUCCESS', $3, $4, $5, $6, $7, $8)`,
          [
            `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            existing.user_id,
            Number(existing.amount),
            currentBalance,
            nextBalance,
            gatewayPaymentId,
            `Razorpay payment ${gatewayPaymentId}`,
            verifiedAt
          ]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return findPaymentOrderById(paymentOrderId);
  }

  const db = __internalGetSqlite();
  db.exec("BEGIN");
  try {
    const existing = db
      .prepare(
        `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
         FROM payment_orders
         WHERE id = ?
         LIMIT 1`
      )
      .get(paymentOrderId);
    if (!existing) {
      db.exec("ROLLBACK");
      return null;
    }
    if (existing.gateway_order_id && existing.gateway_order_id !== gatewayOrderId) {
      throw new Error("Gateway order mismatch");
    }
    if (existing.status !== "SUCCESS") {
      const currentBalance = Number(
        db
          .prepare(
            `SELECT COALESCE(
               (
                 SELECT after_balance
                 FROM wallet_entries
                 WHERE user_id = ?
                 ORDER BY created_at DESC, id DESC
                 LIMIT 1
               ),
               0
             ) AS balance`
          )
          .get(existing.user_id)?.balance ?? 0
      );
      const nextBalance = currentBalance + Number(existing.amount);
      db.prepare(
        `UPDATE payment_orders
         SET status = 'SUCCESS',
             gateway_order_id = ?,
             gateway_payment_id = ?,
             gateway_signature = ?,
             verified_at = ?,
             updated_at = ?
         WHERE id = ?`
      ).run(gatewayOrderId, gatewayPaymentId, gatewaySignature, verifiedAt, verifiedAt, paymentOrderId);
      db.prepare(
        `INSERT INTO wallet_entries (id, user_id, type, status, amount, before_balance, after_balance, reference_id, note, created_at)
         VALUES (?, ?, 'DEPOSIT', 'SUCCESS', ?, ?, ?, ?, ?, ?)`
      ).run(
        `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        existing.user_id,
        Number(existing.amount),
        currentBalance,
        nextBalance,
        gatewayPaymentId,
        `Razorpay payment ${gatewayPaymentId}`,
        verifiedAt
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return findPaymentOrderById(paymentOrderId);
}

export async function completePaymentLinkOrder({ reference, gatewayOrderId, gatewayPaymentId, gatewaySignature = "payment_link_webhook" }) {
  if (!reference) {
    return null;
  }

  const existingOrder = await findPaymentOrderByReference(reference);
  if (!existingOrder) {
    return null;
  }

  return completePaymentOrder({
    paymentOrderId: existingOrder.id,
    gatewayOrderId: gatewayOrderId || existingOrder.gatewayOrderId || `plink_${reference}`,
    gatewayPaymentId: gatewayPaymentId || existingOrder.gatewayPaymentId || `plinkpay_${reference}`,
    gatewaySignature
  });
}

export async function handlePaymentWebhook(reference, status) {
  const updatedAt = __internalNowIso();
  const pool = __internalGetPgPool();

  if (pool) {
    const result = await pool.query(
      `UPDATE payment_orders
       SET status = $2, updated_at = $3
       WHERE reference = $1
       RETURNING id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at`,
      [reference, status, updatedAt]
    );
    return mapPaymentOrderRow(result.rows[0]);
  }

  const db = __internalGetSqlite();
  db.prepare(`UPDATE payment_orders SET status = ?, updated_at = ? WHERE reference = ?`).run(status, updatedAt, reference);
  return mapPaymentOrderRow(
    db
      .prepare(
        `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
         FROM payment_orders
         WHERE reference = ?
         LIMIT 1`
      )
      .get(reference)
  );
}
