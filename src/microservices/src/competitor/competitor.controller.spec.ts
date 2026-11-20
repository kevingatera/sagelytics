import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { CompetitorController } from './competitor.controller';
import type { PaidRun } from '../shared/services/paid-work-deadline';
import { CompetitorService } from './competitor.service';
import { CompetitorDiscoveryService } from './services/competitor-discovery.service';

describe('CompetitorController discovery routing', () => {
  const request = {
    domain: 'example.com',
    userId: 'user-1',
    businessType: 'hospitality',
    knownCompetitors: [],
    productCatalogUrl: '',
    sessionId: 'session-1',
  };

  const buildController = (pipeline?: string) => {
    const legacy = {
      discoverCompetitors: jest.fn().mockResolvedValue({ competitors: [] }),
    };
    const twoStage = {
      discoverCompetitors: jest.fn().mockResolvedValue({ competitors: [] }),
    };
    const config = new ConfigService(
      pipeline ? { DISCOVERY_PIPELINE: pipeline } : {},
    );
    const controller = new CompetitorController(
      legacy as unknown as CompetitorService,
      twoStage as unknown as CompetitorDiscoveryService,
      config,
    );
    return { controller, legacy, twoStage };
  };

  it('routes discovery to the two-stage pipeline when DISCOVERY_PIPELINE=two_stage', async () => {
    const { controller, legacy, twoStage } = buildController('two_stage');

    await controller.discoverCompetitors(request);

    expect(twoStage.discoverCompetitors).toHaveBeenCalledWith(
      'example.com',
      'user-1',
      'hospitality',
      [],
      '',
      'session-1',
      expect.any(Number),
    );
    expect(legacy.discoverCompetitors).not.toHaveBeenCalled();
  });

  it('keeps the legacy pipeline when the flag is unset', async () => {
    const { controller, legacy, twoStage } = buildController();

    await controller.discoverCompetitors(request);

    expect(legacy.discoverCompetitors).toHaveBeenCalledTimes(1);
    expect(twoStage.discoverCompetitors).not.toHaveBeenCalled();
  });

  it('keeps the legacy pipeline when the flag is set to legacy', async () => {
    const { controller, legacy, twoStage } = buildController('legacy');

    await controller.discoverCompetitors(request);

    expect(legacy.discoverCompetitors).toHaveBeenCalledTimes(1);
    expect(twoStage.discoverCompetitors).not.toHaveBeenCalled();
  });
});

describe('CompetitorController discovery deadline', () => {
  const deadlineAt = Date.now() + 60_000;
  const request = {
    domain: 'example.com',
    userId: 'user-1',
    businessType: 'hospitality',
    knownCompetitors: [],
    productCatalogUrl: '',
    deadlineAt,
  };

  const build = (
    pipeline: string,
    legacyImpl: (...args: unknown[]) => unknown,
    twoStageImpl: (...args: unknown[]) => unknown = legacyImpl,
  ) => {
    const legacy = {
      discoverCompetitors: jest.fn((...args: unknown[]) =>
        Promise.resolve().then(() => legacyImpl(...args)),
      ),
    };
    const twoStage = {
      discoverCompetitors: jest.fn((...args: unknown[]) =>
        Promise.resolve().then(() => twoStageImpl(...args)),
      ),
    };
    const controller = new CompetitorController(
      legacy as unknown as CompetitorService,
      twoStage as unknown as CompetitorDiscoveryService,
      new ConfigService({ DISCOVERY_PIPELINE: pipeline }),
    );
    return { controller, legacy, twoStage };
  };

  const failureOf = async (promise: Promise<unknown>) => {
    const error: unknown = await promise.then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(RpcException);
    return (error as RpcException).getError();
  };

  it('passes the caller deadline to the legacy pipeline', async () => {
    const { controller, legacy } = build('legacy', () => ({ competitors: [] }));

    await controller.discoverCompetitors(request);

    const run = legacy.discoverCompetitors.mock.calls[0]?.[6] as PaidRun;
    expect(run.deadlineAt).toBe(deadlineAt);
    expect(run.signal.aborted).toBe(true); // released once the handler returns
  });

  it('passes the caller deadline to the two-stage pipeline', async () => {
    const { controller, twoStage } = build('two_stage', () => ({
      competitors: [],
    }));

    await controller.discoverCompetitors(request);

    expect(twoStage.discoverCompetitors.mock.calls[0]?.[6]).toBe(deadlineAt);
  });

  it('reports zero paid calls when the legacy run failed before any paid request', async () => {
    const { controller } = build('legacy', () => {
      throw new Error('Redis down');
    });

    expect(await failureOf(controller.discoverCompetitors(request))).toEqual({
      code: 'DISCOVERY_FAILED',
      message: 'Competitor discovery failed',
      paidCallsStarted: 0,
    });
  });

  it('reports the paid calls the legacy run started before failing', async () => {
    const { controller } = build('legacy', (...args: unknown[]) => {
      const run = args[6] as PaidRun;
      run.claimPaidCall();
      run.claimPaidCall();
      throw new Error('provider failed');
    });

    expect(
      await failureOf(controller.discoverCompetitors(request)),
    ).toMatchObject({
      paidCallsStarted: 2,
    });
  });

  it('reports an unknown paid call count for a failed two-stage run', async () => {
    const { controller } = build('two_stage', () => {
      throw new Error('boom');
    });

    expect(
      await failureOf(controller.discoverCompetitors(request)),
    ).toMatchObject({
      paidCallsStarted: null,
    });
  });

  it('starts no work and reports zero paid calls when the deadline already passed', async () => {
    const { controller, legacy } = build('legacy', () => ({ competitors: [] }));

    const failure = await failureOf(
      controller.discoverCompetitors({
        ...request,
        deadlineAt: Date.now() - 1,
      }),
    );

    expect(legacy.discoverCompetitors).not.toHaveBeenCalled();
    expect(failure).toEqual({
      code: 'DISCOVERY_FAILED',
      message: 'Competitor discovery ran out of time',
      paidCallsStarted: 0,
    });
  });

  it('stops waiting shortly after the deadline and refuses new paid calls', async () => {
    jest.useFakeTimers({ now: 1_000_000 });
    try {
      let run: PaidRun | undefined;
      const { controller } = build('legacy', (...args: unknown[]) => {
        run = args[6] as PaidRun;
        run.claimPaidCall();
        return new Promise(() => undefined);
      });

      const outcome = failureOf(
        controller.discoverCompetitors({
          ...request,
          deadlineAt: 1_000_000 + 10_000,
        }),
      );
      await jest.advanceTimersByTimeAsync(10_000);
      expect(run?.signal.aborted).toBe(true);
      expect(() => run?.claimPaidCall()).toThrow();
      await jest.advanceTimersByTimeAsync(5_000);

      expect(await outcome).toEqual({
        code: 'DISCOVERY_FAILED',
        message: 'Competitor discovery ran out of time',
        paidCallsStarted: 1,
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
