import { readSmtpConfig, type SmtpSettings } from '~/lib/email/config';
import { sendEmail, type OutgoingEmail } from '~/lib/email/mailer';
import { env } from '~/env';

export interface MailContext {
  smtp: SmtpSettings;
  baseUrl: string;
}

/** SMTP settings and the public origin for links, or null when email is not configured. */
export function readMailContext(): MailContext | null {
  const smtp = readSmtpConfig();
  if (!smtp || !env.NEXTAUTH_URL) return null;
  return { smtp, baseUrl: env.NEXTAUTH_URL };
}

export function appUrl(baseUrl: string, path: string, token?: string): string {
  const url = new URL(path, baseUrl);
  if (token) url.searchParams.set('token', token);
  return url.toString();
}

export function sendAuthEmail(message: OutgoingEmail, context: MailContext): Promise<void> {
  return sendEmail(message, context.smtp);
}
