import { Logger } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { EmailService } from './email.service';
import { loadSmtpConfig, type SmtpConfig } from './smtp-config';

jest.mock('nodemailer');

const configured: SmtpConfig = {
  host: 'smtp.example.test',
  port: 587,
  secure: false,
  auth: { user: 'mailer', pass: 'secret' },
  from: 'Sagelytics <alerts@sagelytics.test>',
};

const alert = {
  to: 'owner@example.test',
  subject: 'Price Alert: Competitor Price Increased',
  content: 'Pro Plan moved from USD 40.00 to USD 49.00.',
};

describe('EmailService', () => {
  let sendMail: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    sendMail = jest.fn().mockResolvedValue({ messageId: '<m-1@smtp.example.test>' });
    (createTransport as unknown as jest.Mock).mockReturnValue({ sendMail });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when SMTP is not configured', () => {
    it('skips every send without building a transport and warns once at startup', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      const service = new EmailService(null);
      const first = await service.sendPriceAlert(alert);
      const second = await service.sendPriceAlert(alert);

      expect(first).toEqual({ status: 'skipped', reason: 'SMTP is not configured' });
      expect(second.status).toBe('skipped');
      expect(createTransport).not.toHaveBeenCalled();
      expect(sendMail).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('when SMTP is configured', () => {
    it('builds a transport from the configured host, port, and credentials', () => {
      new EmailService(configured);

      expect(createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.test',
        port: 587,
        secure: false,
        auth: { user: 'mailer', pass: 'secret' },
      });
    });

    it('sends the alert through nodemailer and reports the message id', async () => {
      const service = new EmailService(configured);

      const result = await service.sendPriceAlert(alert);

      expect(sendMail).toHaveBeenCalledWith({
        from: 'Sagelytics <alerts@sagelytics.test>',
        to: 'owner@example.test',
        subject: 'Price Alert: Competitor Price Increased',
        text: 'Pro Plan moved from USD 40.00 to USD 49.00.',
      });
      expect(result).toEqual({ status: 'sent', messageId: '<m-1@smtp.example.test>' });
    });

    it('reports a rejected send as failed instead of throwing', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      sendMail.mockRejectedValueOnce(new Error('535 authentication failed'));
      const service = new EmailService(configured);

      const result = await service.sendPriceAlert(alert);

      expect(result).toEqual({ status: 'failed', error: '535 authentication failed' });
    });
  });
});

describe('loadSmtpConfig', () => {
  it('returns null without a host, so email stays disabled', () => {
    expect(loadSmtpConfig({ EMAIL_FROM: 'alerts@sagelytics.test' })).toBeNull();
  });

  it('returns null without a sender address', () => {
    expect(loadSmtpConfig({ SMTP_HOST: 'smtp.example.test' })).toBeNull();
  });

  it('applies port 587 and plain transport by default, with no auth when no user is set', () => {
    expect(
      loadSmtpConfig({ SMTP_HOST: 'smtp.example.test', EMAIL_FROM: 'alerts@sagelytics.test' }),
    ).toEqual({
      host: 'smtp.example.test',
      port: 587,
      secure: false,
      auth: undefined,
      from: 'alerts@sagelytics.test',
    });
  });

  it('maps every SMTP setting when provided', () => {
    expect(
      loadSmtpConfig({
        SMTP_HOST: 'smtp.example.test',
        SMTP_PORT: 465,
        SMTP_SECURE: true,
        SMTP_USER: 'mailer',
        SMTP_PASSWORD: 'secret',
        EMAIL_FROM: 'alerts@sagelytics.test',
      }),
    ).toEqual({
      host: 'smtp.example.test',
      port: 465,
      secure: true,
      auth: { user: 'mailer', pass: 'secret' },
      from: 'alerts@sagelytics.test',
    });
  });
});
