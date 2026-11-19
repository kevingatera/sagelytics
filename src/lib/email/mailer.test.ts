import { beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({
  sendMail: vi.fn(),
  createTransport: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  createTransport: transport.createTransport,
}));

import { readSmtpConfig } from './config';
import { sendEmail } from './mailer';

const SMTP_ENV = {
  SMTP_HOST: 'smtp.example.test',
  SMTP_PORT: '465',
  SMTP_USER: 'mailer',
  SMTP_PASSWORD: 'secret-pass',
  SMTP_SECURE: 'true',
  EMAIL_FROM: 'Sagelytics <noreply@example.test>',
};

const MESSAGE = {
  to: 'owner@example.test',
  subject: 'Reset',
  text: 'Reset text',
  html: '<p>Reset html</p>',
};

beforeEach(() => {
  vi.clearAllMocks();
  transport.sendMail.mockResolvedValue({ messageId: 'msg-1' });
  transport.createTransport.mockReturnValue({ sendMail: transport.sendMail });
});

describe('readSmtpConfig', () => {
  it('returns null when SMTP_HOST is missing', () => {
    expect(readSmtpConfig({ EMAIL_FROM: 'a@example.test' })).toBeNull();
  });

  it('returns null when EMAIL_FROM is missing', () => {
    expect(readSmtpConfig({ SMTP_HOST: 'smtp.example.test' })).toBeNull();
  });

  it('parses host, port, secure flag and auth', () => {
    expect(readSmtpConfig(SMTP_ENV)).toEqual({
      host: 'smtp.example.test',
      port: 465,
      secure: true,
      auth: { user: 'mailer', pass: 'secret-pass' },
      from: 'Sagelytics <noreply@example.test>',
    });
  });

  it('defaults to port 587, not secure, and no auth when credentials are absent', () => {
    expect(
      readSmtpConfig({ SMTP_HOST: 'smtp.example.test', EMAIL_FROM: 'a@example.test' }),
    ).toEqual({
      host: 'smtp.example.test',
      port: 587,
      secure: false,
      auth: undefined,
      from: 'a@example.test',
    });
  });

  it('throws when SMTP_PORT is not a positive integer', () => {
    expect(() => readSmtpConfig({ ...SMTP_ENV, SMTP_PORT: 'abc' })).toThrow(
      'SMTP_PORT must be a positive integer',
    );
  });
});

describe('sendEmail', () => {
  it('throws without contacting SMTP when settings are missing', async () => {
    await expect(sendEmail(MESSAGE, null)).rejects.toThrow('SMTP is not configured');
    expect(transport.createTransport).not.toHaveBeenCalled();
  });

  it('sends the message through the configured transport', async () => {
    const smtp = readSmtpConfig(SMTP_ENV);

    await sendEmail(MESSAGE, smtp);

    expect(transport.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.test',
      port: 465,
      secure: true,
      auth: { user: 'mailer', pass: 'secret-pass' },
    });
    expect(transport.sendMail).toHaveBeenCalledWith({
      from: 'Sagelytics <noreply@example.test>',
      to: 'owner@example.test',
      subject: 'Reset',
      text: 'Reset text',
      html: '<p>Reset html</p>',
    });
  });

  it('propagates transport errors to the caller', async () => {
    transport.sendMail.mockRejectedValueOnce(new Error('535 auth failed'));
    const smtp = readSmtpConfig(SMTP_ENV);

    await expect(sendEmail(MESSAGE, smtp)).rejects.toThrow('535 auth failed');
  });
});
