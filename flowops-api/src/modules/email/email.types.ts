export const EMAIL_TEMPLATE_NAMES = {
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  REQUEST_APPROVED: "REQUEST_APPROVED",
  REQUEST_REJECTED: "REQUEST_REJECTED",
  REQUEST_COMPLETED: "REQUEST_COMPLETED",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  COMMENT_ADDED: "COMMENT_ADDED",
} as const;

export type EmailTemplateName =
  (typeof EMAIL_TEMPLATE_NAMES)[keyof typeof EMAIL_TEMPLATE_NAMES];

export interface RenderedEmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface SendTemplatedEmailInput {
  to: string;
  template: EmailTemplateName | string;
  data: Record<string, unknown>;
  subject?: string;
}
