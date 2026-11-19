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
