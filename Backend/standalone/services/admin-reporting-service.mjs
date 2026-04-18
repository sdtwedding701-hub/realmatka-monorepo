import {
  getAdminSnapshotSection,
  getAuditLogsPage,
  getDashboardSummaryData,
  getMonitoringSummaryData,
  getReconciliationSummaryData,
  getReportsSummaryData,
  getUsersPage,
  getWalletRequestHistoryPage,
  listBidsPage
} from "../stores/admin-store.mjs";

function startOfTodayIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function lastNDates(days) {
  const dates = [];
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  for (let index = days - 1; index >= 0; index -= 1) {
    const item = new Date(current);
    item.setDate(current.getDate() - index);
    dates.push(item.toISOString().slice(0, 10));
  }
  return dates;
}

function normalizeDate(value, fallback) {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsvLine(row) {
  return row.map((cell) => csvEscape(cell)).join(",");
}

function normalizeSnapshotSection(value) {
  const allowed = new Set(["users", "sessions", "walletEntries", "bids", "markets", "notificationDevices"]);
  const section = String(value ?? "").trim();
  return allowed.has(section) ? section : "";
}

export async function getDashboardSummary(options = {}) {
  const includeRecent = options.includeRecent !== false;
  const includeTrends = options.includeTrends !== false;
  const summary = await getDashboardSummaryData(startOfTodayIso(), lastNDates(7));
  return {
    totals: summary.totals,
    today: summary.today,
    trends: includeTrends ? summary.trends : undefined,
    pendingWork: summary.pendingWork,
    topUsers: summary.topUsers,
    recentBids: includeRecent ? summary.recentBids : [],
    recentRequests: includeRecent ? summary.recentRequests : []
  };
}

export async function getReportsSummary(fromValue, toValue, options = {}) {
  const from = normalizeDate(fromValue, startOfTodayIso());
  const to = normalizeDate(toValue, new Date().toISOString());
  const report = await getReportsSummaryData(from, to);
  const userLimit = Math.max(1, Math.min(500, Number(options.userLimit ?? 100) || 100));
  const marketLimit = Math.max(1, Math.min(500, Number(options.marketLimit ?? 100) || 100));
  const includeSeries = options.includeSeries !== false;
  return {
    range: { from, to },
    totals: report.totals,
    pagination: {
      userReportsReturned: Math.min(report.userReports.length, userLimit),
      userReportsTotal: report.userReports.length,
      marketReportsReturned: Math.min(report.marketReports.length, marketLimit),
      marketReportsTotal: report.marketReports.length
    },
    userReports: report.userReports.slice(0, userLimit),
    marketReports: report.marketReports.slice(0, marketLimit),
    dailySeries: includeSeries ? report.dailySeries : []
  };
}

export async function getMonitoringSummary() {
  const summaryData = await getMonitoringSummaryData();
  return {
    summary: {
      blockedUsers: summaryData.blockedUsers,
      deactivatedUsers: summaryData.deactivatedUsers,
      pendingWithdraws: summaryData.pendingWithdraws,
      pendingDeposits: summaryData.pendingDeposits,
      placeholderResults: summaryData.placeholderResults,
      supportUnread: summaryData.supportUnread,
      supportConversations: summaryData.supportConversations,
      auditEvents: summaryData.auditEvents
    },
    alerts: [
      summaryData.pendingWithdraws > 0 ? { level: summaryData.pendingWithdraws >= 5 ? "high" : "medium", title: "Pending withdraw queue", body: `${summaryData.pendingWithdraws} withdraw requests are waiting.` } : null,
      summaryData.pendingDeposits > 0 ? { level: "medium", title: "Pending deposit queue", body: `${summaryData.pendingDeposits} deposit requests are waiting.` } : null,
      summaryData.supportUnread > 0 ? { level: summaryData.supportUnread >= 5 ? "high" : "medium", title: "Unread support inbox", body: `${summaryData.supportUnread} user messages are waiting in support chat.` } : null,
      summaryData.blockedUsers > 0 ? { level: "medium", title: "Blocked users present", body: `${summaryData.blockedUsers} blocked users require review.` } : null,
      summaryData.placeholderResults > 0 ? { level: "low", title: "Markets without results", body: `${summaryData.placeholderResults} markets still show placeholder result strings.` } : null
    ].filter(Boolean),
    recentAuditFlags: summaryData.recentAuditFlags
  };
}

export async function getSnapshotSection(sectionValue, options = {}) {
  const section = normalizeSnapshotSection(sectionValue);
  if (!section) {
    return { ok: false, status: 400, error: "Unsupported snapshot section" };
  }

  const snapshotSection = await getAdminSnapshotSection(section, {
    page: options.page,
    limit: options.limit
  });

  if (!snapshotSection) {
    return { ok: false, status: 404, error: "Snapshot section not found" };
  }

  return {
    ok: true,
    data: snapshotSection
  };
}

export async function getReconciliationSummary(options = {}) {
  return getReconciliationSummaryData({
    recentLimit: options.limit ?? 30,
    page: options.page ?? 1,
    staleHours: options.staleHours ?? 24,
    type: options.type,
    status: options.status
  });
}

async function* buildPagedRows(fetchPage, mapItem) {
  let offset = 0;
  const limit = 500;
  while (true) {
    const page = await fetchPage({ limit, offset });
    for (const item of page.items) {
      yield mapItem(item);
    }
    if (!page.pagination?.hasMore) {
      break;
    }
    offset += limit;
  }
}

export async function buildExportPayload(type) {
  let header = [];
  let rowCount = 0;
  let rowsStreamFactory = null;
  if (type === "users") {
    header = ["id", "name", "phone", "role", "approvalStatus", "blockedAt", "deactivatedAt", "referralCode"];
    rowCount = (await getUsersPage({ limit: 1, offset: 0 })).pagination.total;
    rowsStreamFactory = () =>
      buildPagedRows(
        (page) => getUsersPage(page),
        (user) => [user.id, user.name, user.phone, user.role, user.approvalStatus, user.blockedAt ?? "", user.deactivatedAt ?? "", user.referralCode]
      );
  } else if (type === "bids") {
    header = ["id", "userId", "market", "boardLabel", "sessionType", "digit", "points", "status", "payout", "createdAt"];
    rowCount = (await listBidsPage({ limit: 1, offset: 0 })).pagination.total;
    rowsStreamFactory = () =>
      buildPagedRows(
        (page) => listBidsPage(page),
        (bid) => [bid.id, bid.userId, bid.market, bid.boardLabel, bid.sessionType, bid.digit, bid.points, bid.status, bid.payout, bid.createdAt]
      );
  } else if (type === "requests") {
    header = ["id", "userId", "type", "status", "amount", "referenceId", "proofUrl", "createdAt"];
    rowCount = (await getWalletRequestHistoryPage({ limit: 1, offset: 0 })).pagination.total;
    rowsStreamFactory = () =>
      buildPagedRows(
        (page) => getWalletRequestHistoryPage(page),
        (item) => [item.id, item.userId, item.type, item.status, item.amount, item.referenceId ?? "", item.proofUrl ?? "", item.createdAt]
      );
  } else if (type === "audit") {
    header = ["id", "actorUserId", "action", "entityType", "entityId", "createdAt"];
    rowCount = (await getAuditLogsPage({ limit: 1, offset: 0 })).pagination.total;
    rowsStreamFactory = () =>
      buildPagedRows(
        (page) => getAuditLogsPage(page),
        (item) => [item.id, item.actorUserId, item.action, item.entityType, item.entityId, item.createdAt]
      );
  } else {
    return { ok: false, status: 400, error: "Unsupported export type" };
  }

  async function* rowsToCsvStream() {
    yield `${toCsvLine(header)}\n`;
    for await (const row of rowsStreamFactory()) {
      yield `${toCsvLine(row)}\n`;
    }
  }

  return {
    ok: true,
    data: {
      type,
      filename: `${type}-${Date.now()}.csv`,
      stream: rowsToCsvStream(),
      mimeType: "text/csv",
      charset: "utf-8",
      rowCount
    }
  };
}
