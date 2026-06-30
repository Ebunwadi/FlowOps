export const EMAIL_QUEUE_NAME = "email";

export const NOTIFICATION_QUEUE_NAME = "notification";

export const EMAIL_JOB_NAMES = {
  SEND_EMAIL: "send-email",
} as const;

export const NOTIFICATION_JOB_NAMES = {
  DELIVER: "deliver",
} as const;
