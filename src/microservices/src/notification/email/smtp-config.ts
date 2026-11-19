export const SMTP_CONFIG = Symbol('SMTP_CONFIG');

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
  from: string;
}

export interface SmtpEnv {
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_SECURE?: boolean;
  EMAIL_FROM?: string;
}

/**
 * Returns the SMTP settings when the host and sender are set, otherwise null.
 * A null result means email is disabled and callers skip sending.
 */
export function loadSmtpConfig(env: SmtpEnv): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (!host || !from) {
    return null;
  }

  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASSWORD;

  return {
    host,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    auth: user && pass ? { user, pass } : undefined,
    from,
  };
}
