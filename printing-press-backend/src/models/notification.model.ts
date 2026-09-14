export type NotificationType = 'JOB' | 'ASSIGNMENT' | 'STATUS_UPDATE' | 'ALERT';

export interface Notification {
  notification_id: number;
  user_id: number;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}