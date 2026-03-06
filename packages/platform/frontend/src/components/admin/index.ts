/**
 * Admin Dashboard Module
 *
 * Multi-tenant admin UI and analytics dashboard for the HoloLand platform.
 * Exports all admin components, types, and style utilities.
 *
 * @module admin
 */

// Types
export * from './AdminTypes';

// Styles
export { adminStyles, COLORS, FONTS, getUsageColor, getFPSColor, getChartColor } from './AdminStyles';

// Components
export { AdminDashboard, type AdminDashboardProps } from './AdminDashboard';
export { TenantManagement, type TenantManagementProps } from './TenantManagement';
export { UsageQuotaDashboard, type UsageQuotaDashboardProps } from './UsageQuotaDashboard';
export { AnalyticsDashboard, type AnalyticsDashboardProps } from './AnalyticsDashboard';
export { ABTestManagement, type ABTestManagementProps } from './ABTestManagement';
export { RealTimePerformanceMonitor, type RealTimePerformanceMonitorProps } from './RealTimePerformanceMonitor';
export { AuditLogViewer, type AuditLogViewerProps } from './AuditLogViewer';
