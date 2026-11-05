import { ConfigService } from '@nestjs/config';
import { CompetitorController } from './competitor.controller';
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
