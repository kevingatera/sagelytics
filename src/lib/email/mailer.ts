import { createTransport } from 'nodemailer';
import { type SmtpSettings } from './config';

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends one email through SMTP. Throws when SMTP is not configured or the
 * transport rejects the message, so callers decide how to handle failure.
 */
export async function sendEmail(message: OutgoingEmail, smtp: SmtpSettings | null): Promise<void> {
  if (!smtp) {
    throw new Error('SMTP is not configured');
  }

  const transporter = createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  });

  await transporter.sendMail({
    from: smtp.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
