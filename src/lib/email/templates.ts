export interface PasswordResetContent {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPasswordResetEmail(resetUrl: string): PasswordResetContent {
  const safeUrl = escapeHtml(resetUrl);

  return {
    subject: 'Reset your Sagelytics password',
    text: [
      'We received a request to reset your Sagelytics password.',
      '',
      `Reset your password here: ${resetUrl}`,
      '',
      'This link expires in 1 hour. If you did not request a reset, you can ignore this email.',
    ].join('\n'),
    html: [
      '<p>We received a request to reset your Sagelytics password.</p>',
      `<p><a href="${safeUrl}">Reset your password</a></p>`,
      '<p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>',
    ].join(''),
  };
}

export function buildVerifyEmail(verifyUrl: string): PasswordResetContent {
  const safeUrl = escapeHtml(verifyUrl);

  return {
    subject: 'Confirm your Sagelytics email address',
    text: [
      'Thanks for signing up for Sagelytics.',
      '',
      `Confirm your email address here: ${verifyUrl}`,
      '',
      'This link expires in 24 hours. If you did not create an account, you can ignore this email.',
    ].join('\n'),
    html: [
      '<p>Thanks for signing up for Sagelytics.</p>',
      `<p><a href="${safeUrl}">Confirm your email address</a></p>`,
      '<p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>',
    ].join(''),
  };
}

export function buildAccountExistsEmail(loginUrl: string, resetUrl: string): PasswordResetContent {
  const safeLogin = escapeHtml(loginUrl);
  const safeReset = escapeHtml(resetUrl);

  return {
    subject: 'You already have a Sagelytics account',
    text: [
      'Someone tried to register a Sagelytics account with this email address, but you already have one.',
      '',
      `Log in here: ${loginUrl}`,
      `Forgot your password? Reset it here: ${resetUrl}`,
      '',
      'If this was not you, you can ignore this email. Your account has not changed.',
    ].join('\n'),
    html: [
      '<p>Someone tried to register a Sagelytics account with this email address, but you already have one.</p>',
      `<p><a href="${safeLogin}">Log in</a> or <a href="${safeReset}">reset your password</a>.</p>`,
      '<p>If this was not you, you can ignore this email. Your account has not changed.</p>',
    ].join(''),
  };
}
