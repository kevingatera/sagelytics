export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
  from: string;
}

type EnvSource = Record<string, string | undefined>;

/**
 * Reads SMTP settings from the environment. Returns null when SMTP_HOST or
 * EMAIL_FROM is missing, which means email is disabled.
 */
export function readSmtpConfig(source: EnvSource = process.env): SmtpSettings | null {
  const host = source.SMTP_HOST?.trim();
  const from = source.EMAIL_FROM?.trim();
  if (!host || !from) {
    return null;
  }

  const portSetting = source.SMTP_PORT?.trim();
  const port = portSetting ? Number(portSetting) : 587;
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a positive integer');
  }

  const user = source.SMTP_USER?.trim();
  const pass = source.SMTP_PASSWORD;

  return {
    host,
    port,
    secure: source.SMTP_SECURE?.trim() === 'true',
    auth: user && pass ? { user, pass } : undefined,
    from,
  };
}
