export const WEBHOOK_EVENT_TYPES = [
  "workflow.request.submitted",
  "workflow.request.approved",
  "workflow.request.rejected",
  "workflow.request.completed",
  "workflow.comment.added",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export type WebhookDeliveryStatus = "PENDING" | "DELIVERED" | "FAILED";

export interface WebhookEndpointSummary {
  id: string;
  organisationId: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export interface CreatedWebhookEndpoint extends WebhookEndpointSummary {
  secret: string;
}

export interface WebhookDeliverySummary {
  id: string;
  webhookEndpointId: string;
  eventType: string;
  payload: unknown;
  status: WebhookDeliveryStatus;
  responseStatus: number | null;
  responseBody: string | null;
  attempts: number;
  nextAttemptAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface CreateWebhookEndpointInput {
  name: string;
  url: string;
  events: WebhookEventType[];
  isActive?: boolean;
}

export interface UpdateWebhookEndpointInput {
  name?: string;
  url?: string;
  events?: WebhookEventType[];
  isActive?: boolean;
}

export const WEBHOOK_EVENT_LABELS: Record<WebhookEventType, string> = {
  "workflow.request.submitted": "Request submitted",
  "workflow.request.approved": "Approval step completed",
  "workflow.request.rejected": "Request rejected",
  "workflow.request.completed": "Request fully approved",
  "workflow.comment.added": "Comment added",
};
