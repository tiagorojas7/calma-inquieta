export * from "./domain/email-templates";
export {
  createDisabledEmailSender,
  createNotificationService,
  FEE_REMINDER_AFTER_HOURS,
  type NotificationService,
  type NotificationServiceDeps,
  type OrderNotice,
  type ReminderRunSummary,
} from "./application/notification-service";
export type {
  AudienceOrder,
  EmailMessage,
  EmailSender,
  EmailSendFailure,
  NotificationAudience,
} from "./application/notification-ports";
