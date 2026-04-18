import {
  getAdminSnapshot as getAdminSnapshotRecord,
  getAdminSnapshotSection as getAdminSnapshotSectionRecord,
  getAuditLogsPage as getAuditLogsPageRecord,
  getAuditLogs as getAuditLogsRecord,
  getDashboardSummaryData as getDashboardSummaryDataRecord,
  getMonitoringSummaryData as getMonitoringSummaryDataRecord,
  getReconciliationSummaryData as getReconciliationSummaryDataRecord,
  getReportsSummaryData as getReportsSummaryDataRecord
} from "../db/admin-reporting-db.mjs";

export const getAdminSnapshot = getAdminSnapshotRecord;
export const getAdminSnapshotSection = getAdminSnapshotSectionRecord;
export const getAuditLogsPage = getAuditLogsPageRecord;
export const getAuditLogs = getAuditLogsRecord;
export const getDashboardSummaryData = getDashboardSummaryDataRecord;
export const getMonitoringSummaryData = getMonitoringSummaryDataRecord;
export const getReconciliationSummaryData = getReconciliationSummaryDataRecord;
export const getReportsSummaryData = getReportsSummaryDataRecord;
