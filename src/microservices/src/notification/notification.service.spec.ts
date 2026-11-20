import { Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';
import type { EmailService } from './email/email.service';
import type { DatabaseService } from '../shared/services/database.service';

const ALERT_ID = '6f1c2b0e-1111-4c3d-9e8f-0000000000aa';
const LOG_ID = '6f1c2b0e-2222-4c3d-9e8f-0000000000bb';

function alert(overrides: Partial<{ alertType: string }> = {}) {
  return {
    id: ALERT_ID,
    userId: 'user-1',
    monitoringTaskId: 'task-1',
    alertType: 'price_increase',
    thresholdValue: 22.5,
    thresholdType: 'percentage',
    enabled: true,
    createdAt: new Date('2026-11-18T12:00:00Z'),
    ...overrides,
  };
}

function build(
  options: {
    email?: string | null;
    settings?: { enablePriceAlerts: boolean } | null;
    emailResult?: unknown;
    emailThrows?: Error;
  } = {},
) {
  const database = {
    getUserById: jest.fn().mockResolvedValue(
      options.email === null ? null : { id: 'user-1', email: options.email ?? 'owner@example.test' },
    ),
    getUserNotificationSettings: jest.fn().mockResolvedValue(
      options.settings === undefined
        ? { enablePriceAlerts: true, enableCompetitorUpdates: true, enableMarketInsights: true, enableBillingUpdates: true, schedule: 'instant' }
        : options.settings,
    ),
    createNotificationLog: jest.fn().mockResolvedValue(LOG_ID),
    updateNotificationStatus: jest.fn().mockResolvedValue(undefined),
  };
  const email = {
    sendPriceAlert: options.emailThrows
      ? jest.fn().mockRejectedValue(options.emailThrows)
      : jest.fn().mockResolvedValue(options.emailResult ?? { status: 'sent', messageId: 'm-1' }),
  };
  const service = new NotificationService(
    email as unknown as EmailService,
    database as unknown as DatabaseService,
  );
  return { service, database, email };
}

describe('NotificationService alert delivery', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs the alert with its real id as pending, then marks it sent', async () => {
    const { service, database, email } = build();

    const status = await service.sendAlert(alert());

    expect(status).toBe('sent');
    expect(database.createNotificationLog).toHaveBeenCalledWith(
      expect.objectContaining({ alertId: ALERT_ID, recipient: 'owner@example.test', status: 'pending' }),
    );
    expect(email.sendPriceAlert).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@example.test' }));
    expect(database.updateNotificationStatus).toHaveBeenCalledWith(LOG_ID, 'sent');
  });

  it('records a skipped send with its reason when SMTP is not configured', async () => {
    const { service, database } = build({
      emailResult: { status: 'skipped', reason: 'SMTP is not configured' },
    });

    const status = await service.sendAlert(alert());

    expect(status).toBe('skipped');
    expect(database.updateNotificationStatus).toHaveBeenCalledWith(LOG_ID, 'skipped', 'SMTP is not configured');
  });

  it('records a failed send with the error message', async () => {
    const { service, database } = build({
      emailResult: { status: 'failed', error: '535 authentication failed' },
    });

    const status = await service.sendAlert(alert());

    expect(status).toBe('failed');
    expect(database.updateNotificationStatus).toHaveBeenCalledWith(
      LOG_ID,
      'failed',
      '535 authentication failed',
    );
  });

  it('marks the log failed when the email layer throws unexpectedly', async () => {
    const { service, database } = build({ emailThrows: new Error('socket hang up') });

    const status = await service.sendAlert(alert());

    expect(status).toBe('failed');
    expect(database.updateNotificationStatus).toHaveBeenCalledWith(LOG_ID, 'failed', 'socket hang up');
  });

  it('logs a skipped row and sends nothing when the user disabled price alerts', async () => {
    const { service, database, email } = build({ settings: { enablePriceAlerts: false } });

    const status = await service.sendAlert(alert());

    expect(status).toBe('skipped');
    expect(email.sendPriceAlert).not.toHaveBeenCalled();
    expect(database.createNotificationLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'skipped', errorMessage: expect.any(String) }),
    );
  });

  it('writes nothing when the user has no email, since the log needs a recipient', async () => {
    const { service, database, email } = build({ email: null });

    const status = await service.sendAlert(alert());

    expect(status).toBe('skipped');
    expect(database.createNotificationLog).not.toHaveBeenCalled();
    expect(email.sendPriceAlert).not.toHaveBeenCalled();
  });

  it('includes the moved prices in the email when alert details are given', async () => {
    const { service, email } = build();

    await service.sendAlert(alert(), {
      productName: 'Pro Plan',
      competitorDomain: 'competitor.example',
      currency: 'USD',
      previousPrice: 40,
      currentPrice: 49,
      changePercentage: 22.5,
    });

    expect(email.sendPriceAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Pro Plan (competitor.example) moved from USD 40.00 to USD 49.00 (+22.5%).'),
      }),
    );
  });
});
