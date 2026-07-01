import { env } from "../../config/env";
import {
  EMAIL_TEMPLATE_NAMES,
  type EmailTemplateName,
  type RenderedEmailContent,
} from "./email.types";

function readString(
  data: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
  const value = data[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function resolvePublicActionUrl(actionUrl: string): string {
  if (/^https?:\/\//i.test(actionUrl)) {
    return actionUrl;
  }

  const baseUrl = env.appPublicUrl.replace(/\/$/, "");
  const path = actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`;
  return `${baseUrl}${path}`;
}

function wrapHtml(body: string, actionUrl = ""): string {
  const actionBlock =
    actionUrl.trim().length > 0
      ? `<p><a href="${escapeHtml(actionUrl)}">Open in FlowOps</a></p>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
  <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
    ${body
      .split("\n")
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join("\n    ")}
    ${actionBlock}
    <p style="color: #6b7280; font-size: 12px;">FlowOps notification</p>
  </body>
</html>`;
}

function renderApprovalRequired(data: Record<string, unknown>): RenderedEmailContent {
  const recipientName = readString(data, "recipientName", "there");
  const requestTitle = readString(data, "requestTitle", "A workflow request");
  const workflowName = readString(data, "workflowName", "Workflow");
  const actionUrl = resolvePublicActionUrl(readString(data, "actionUrl", "/approvals"));

  const text = [
    `Hi ${recipientName},`,
    "",
    `"${requestTitle}" (${workflowName}) is waiting for your approval.`,
    "",
    `Review the request: ${actionUrl}`,
  ].join("\n");

  return {
    subject: "Approval required",
    text,
    html: wrapHtml(text, actionUrl),
  };
}

function renderRequestApproved(data: Record<string, unknown>): RenderedEmailContent {
  const recipientName = readString(data, "recipientName", "there");
  const requestTitle = readString(data, "requestTitle", "Your request");
  const approvedStepName = readString(data, "approvedStepName", "the previous step");
  const nextStepName = readString(data, "nextStepName", "the next step");
  const actionUrl = resolvePublicActionUrl(readString(data, "actionUrl", "/requests"));

  const text = [
    `Hi ${recipientName},`,
    "",
    `"${requestTitle}" was approved at "${approvedStepName}" and moved to "${nextStepName}".`,
    "",
    `View the request: ${actionUrl}`,
  ].join("\n");

  return {
    subject: "Request approved",
    text,
    html: wrapHtml(text, actionUrl),
  };
}

function renderRequestRejected(data: Record<string, unknown>): RenderedEmailContent {
  const recipientName = readString(data, "recipientName", "there");
  const requestTitle = readString(data, "requestTitle", "Your request");
  const comment = readString(data, "comment", "No comment was provided.");
  const actionUrl = resolvePublicActionUrl(readString(data, "actionUrl", "/requests"));

  const text = [
    `Hi ${recipientName},`,
    "",
    `"${requestTitle}" was rejected.`,
    "",
    `Comment: ${comment}`,
    "",
    `View the request: ${actionUrl}`,
  ].join("\n");

  return {
    subject: "Request rejected",
    text,
    html: wrapHtml(text, actionUrl),
  };
}

function renderRequestCompleted(data: Record<string, unknown>): RenderedEmailContent {
  const recipientName = readString(data, "recipientName", "there");
  const requestTitle = readString(data, "requestTitle", "Your request");
  const actionUrl = resolvePublicActionUrl(readString(data, "actionUrl", "/requests"));

  const text = [
    `Hi ${recipientName},`,
    "",
    `"${requestTitle}" has been fully approved and completed.`,
    "",
    `View the request: ${actionUrl}`,
  ].join("\n");

  return {
    subject: "Request completed",
    text,
    html: wrapHtml(text, actionUrl),
  };
}

function renderChangesRequested(data: Record<string, unknown>): RenderedEmailContent {
  const recipientName = readString(data, "recipientName", "there");
  const requestTitle = readString(data, "requestTitle", "Your request");
  const comment = readString(data, "comment", "Please review the requested changes.");
  const actionUrl = resolvePublicActionUrl(readString(data, "actionUrl", "/requests"));

  const text = [
    `Hi ${recipientName},`,
    "",
    `Changes were requested on "${requestTitle}".`,
    "",
    `Comment: ${comment}`,
    "",
    `Update the request: ${actionUrl}`,
  ].join("\n");

  return {
    subject: "Changes requested",
    text,
    html: wrapHtml(text, actionUrl),
  };
}

function renderCommentAdded(data: Record<string, unknown>): RenderedEmailContent {
  const recipientName = readString(data, "recipientName", "there");
  const requestTitle = readString(data, "requestTitle", "A workflow request");
  const authorName = readString(data, "authorName", "Someone");
  const comment = readString(data, "comment", "");
  const actionUrl = resolvePublicActionUrl(readString(data, "actionUrl", "/requests"));

  const text = [
    `Hi ${recipientName},`,
    "",
    `${authorName} commented on "${requestTitle}":`,
    "",
    comment,
    "",
    `View the request: ${actionUrl}`,
  ].join("\n");

  return {
    subject: "New comment on your request",
    text,
    html: wrapHtml(text, actionUrl),
  };
}

const templateRenderers: Record<
  EmailTemplateName,
  (data: Record<string, unknown>) => RenderedEmailContent
> = {
  [EMAIL_TEMPLATE_NAMES.APPROVAL_REQUIRED]: renderApprovalRequired,
  [EMAIL_TEMPLATE_NAMES.REQUEST_APPROVED]: renderRequestApproved,
  [EMAIL_TEMPLATE_NAMES.REQUEST_REJECTED]: renderRequestRejected,
  [EMAIL_TEMPLATE_NAMES.REQUEST_COMPLETED]: renderRequestCompleted,
  [EMAIL_TEMPLATE_NAMES.CHANGES_REQUESTED]: renderChangesRequested,
  [EMAIL_TEMPLATE_NAMES.COMMENT_ADDED]: renderCommentAdded,
};

export function renderEmailTemplate(
  template: string,
  data: Record<string, unknown>,
): RenderedEmailContent {
  const renderer = templateRenderers[template as EmailTemplateName];

  if (!renderer) {
    throw new Error(`Unknown email template: ${template}`);
  }

  return renderer(data);
}

export function isEmailTemplateName(template: string): template is EmailTemplateName {
  return Object.values(EMAIL_TEMPLATE_NAMES).includes(template as EmailTemplateName);
}
