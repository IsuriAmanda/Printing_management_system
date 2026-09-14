export interface DashboardStats {
  totalQuotations: number;
  completedJobs: number;
  pendingJobs: number;
  delayedJobs: number;
}

export interface QuotationSummary {
  confirmed: number;
  rejected: number;
  pending: number;
  averageValue: number;
  monthlyValue: number;
}

export interface ProductionStage {
  stage: string;
  count: number;
}

export interface NotificationItem {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  createdAt: string;
}

export interface PendingTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface MachineUtilization {
  machineName: string;
  utilization: number;
}

export interface CustomerSummary {
  customerName: string;
  orderCount: number;
  status: string;

}export interface UserOverview {
  totalUsers: number;
  managers: number;
  operators: number;
  activeUsers: number;
}
