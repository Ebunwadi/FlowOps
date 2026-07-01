import nodemailer, { type Transporter } from "nodemailer";

import { LogOrigin } from "../../common/logging/logFormat";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { EmailDeliveryError } from "./email.errors";
import { renderEmailTemplate } from "./email.templates";
import type { SendEmailInput, SendTemplatedEmailInput } from "./email.types";

let smtpTransporter: Transporter | null = null;

function shouldUseConsoleTransport(): boolean {
  return env.emailTransport === "console" || env.nodeEnv === "test";
}

function getSmtpTransporter(): Transporter {
  if (!smtpTransporter) {
    if (!env.smtpHost) {
      throw new EmailDeliveryError("SMTP_HOST is required when EMAIL_TRANSPORT=smtp");
    }

    smtpTransporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth:
        env.smtpUser && env.smtpPassword
          ? {
              user: env.smtpUser,
              pass: env.smtpPassword,
            }
          : undefined,
    });
  }

  return smtpTransporter;
}

function logConsoleEmail(input: SendEmailInput): void {
  logger.info(
    {
      origin: LogOrigin.API,
      event: "email.console_delivery",
      to: input.to,
      subject: input.subject,
      text: input.text,
    },
    `[Email] Console delivery to ${input.to}: ${input.subject}`,
  );
}

async function sendViaSmtp(input: SendEmailInput): Promise<void> {
  const transporter = getSmtpTransporter();

  await transporter.sendMail({
    from: env.emailFrom,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  try {
    if (shouldUseConsoleTransport()) {
      logConsoleEmail(input);
      return;
    }

    await sendViaSmtp(input);
  } catch (error) {
    logger.error(
      {
        origin: LogOrigin.API,
        event: "email.delivery_failed",
        to: input.to,
        subject: input.subject,
        transport: env.emailTransport,
        error,
      },
      `[Email] Failed to deliver email to ${input.to}`,
    );

    if (error instanceof EmailDeliveryError) {
      throw error;
    }

    throw new EmailDeliveryError("Failed to deliver email", error);
  }
}

export async function sendTemplatedEmail(input: SendTemplatedEmailInput): Promise<void> {
  const rendered = renderEmailTemplate(input.template, input.data);

  await sendEmail({
    to: input.to,
    subject: input.subject ?? rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}

export async function verifyEmailTransport(): Promise<void> {
  if (shouldUseConsoleTransport()) {
    return;
  }

  await getSmtpTransporter().verify();
}

export function resetEmailTransportForTests(): void {
  smtpTransporter = null;
}
