import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
for (const envPath of [resolve(currentDir, "../../.env.local"), resolve(currentDir, "../../.env")]) {
  if (!existsSync(envPath)) continue;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;
    const value = line.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, "$1");
    process.env[key] = value;
  }
}

const { findUserByPhone, getUserBalance, getWalletEntriesForUser, rebalanceWalletEntriesForUser } = await import("../db.mjs");

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const phone = String(args.phone || "").replace(/\D/g, "");
  const userId = String(args.userId || "").trim();

  if (!phone && !userId) {
    fail("Usage: node ops/rebalance-user-wallet.mjs --phone 9322434613");
  }

  const user = phone ? await findUserByPhone(phone) : { id: userId, phone: "" };
  if (!user?.id) {
    fail(`User not found for phone ${phone}`);
  }

  const beforeBalance = await getUserBalance(user.id);
  const afterBalance = await rebalanceWalletEntriesForUser(user.id);
  const latestEntries = await getWalletEntriesForUser(user.id, 8);

  console.log(
    JSON.stringify(
      {
        ok: true,
        userId: user.id,
        phone: user.phone || phone || null,
        beforeBalance,
        afterBalance,
        latestEntries: latestEntries.map((entry) => ({
          id: entry.id,
          type: entry.type,
          status: entry.status,
          amount: entry.amount,
          beforeBalance: entry.beforeBalance,
          afterBalance: entry.afterBalance,
          createdAt: entry.createdAt
        }))
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  fail(error?.message || String(error));
});
