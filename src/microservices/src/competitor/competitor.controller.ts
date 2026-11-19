import {
  createAnalysisBudget,
  createPaidRun,
  PaidDeadlineExceededError,
  runWithPaidDeadline,
  type PaidRun,
} from '../shared/services/paid-work-deadline';
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import type {
  DiscoveryResult,
  BusinessContext,
  CompetitorInsight,
} from '@shared/types';
import { CompetitorService } from './competitor.service';
import { CompetitorDiscoveryService } from './services/competitor-discovery.service';
import { catalogHostForLog } from '../common/utils/log-redaction';

/** Used when a caller sends no deadline; matches the app's default (120 s TCP timeout - 10 s). */
export const DEFAULT_DISCOVERY_DEADLINE_MS = 110_000;
const MAX_DISCOVERY_DEADLINE_MS = 900_000;
/** Time after the deadline for a run to return what it has. The app waits 10 s past the deadline. */
export const DISCOVERY_SETTLE_MS = 5_000;
/** The app reads this code to find `paidCallsStarted` on a failed discovery. */
export const DISCOVERY_FAILED_CODE = 'DISCOVERY_FAILED';

export type DiscoveryFailure = {
  code: typeof DISCOVERY_FAILED_CODE;
  message: string;
  /** Paid provider requests the run dispatched, or null when the pipeline does not count them. */
  paidCallsStarted: number | null;
};

@Controller()
export class CompetitorController {
  private readonly logger = new Logger(CompetitorController.name);

  constructor(
    private readonly competitorService: CompetitorService,
    private readonly competitorDiscoveryService: CompetitorDiscoveryService,
    private readonly configService: ConfigService,
  ) {}

  @MessagePattern('discover_competitors')
  async discoverCompetitors(data: {
    domain: string;
    userId: string;
    businessType: string;
    knownCompetitors?: string[];
    productCatalogUrl: string;
    sessionId?: string;
    /** Absolute time (epoch ms) after which the run starts no paid call. */
    deadlineAt?: number;
  }): Promise<DiscoveryResult> {
    this.logger.debug(
      `Received 'discover_competitors' message for domain: ${data.domain}`,
    );
    this.logger.debug({
      userId: data.userId,
      businessType: data.businessType,
      knownCompetitorsCount: data.knownCompetitors?.length || 0,
      catalogHost: catalogHostForLog(data.productCatalogUrl),
      deadlineInMs: data.deadlineAt ? data.deadlineAt - Date.now() : null,
    });

    const pipeline = this.configService.get<string>(
      'DISCOVERY_PIPELINE',
      'legacy',
    );
    let paidRun: PaidRun | undefined;
    try {
      const result = await runWithPaidDeadline(
        data.deadlineAt ?? Date.now() + DEFAULT_DISCOVERY_DEADLINE_MS,
        (deadline) => {
          paidRun = createPaidRun(deadline);
          return pipeline === 'two_stage'
            ? this.competitorDiscoveryService.discoverCompetitors(
                data.domain,
                data.userId,
                data.businessType,
                data.knownCompetitors,
                data.productCatalogUrl,
                data.sessionId,
                deadline.deadlineAt,
              )
            : this.competitorService.discoverCompetitors(
                data.domain,
                data.userId,
                data.businessType,
                data.knownCompetitors,
                data.productCatalogUrl,
                data.sessionId,
                paidRun,
              );
        },
        { maxMs: MAX_DISCOVERY_DEADLINE_MS, settleMs: DISCOVERY_SETTLE_MS },
      );

      this.logger.debug(
        `Completed 'discover_competitors' for ${data.domain}, found ${result.competitors.length} competitors`,
      );
      return result;
    } catch (error) {
      // Only the legacy pipeline counts its requests. Two-stage reports null, so the app keeps
      // the charge. No paidRun means the deadline had passed before any work started.
      let paidCallsStarted: number | null;
      if (!paidRun) paidCallsStarted = 0;
      else if (pipeline === 'two_stage') paidCallsStarted = null;
      else paidCallsStarted = paidRun.paidCallsStarted;
      this.logger.error(
        `Error processing 'discover_competitors' for ${data.domain} (paid calls started: ${paidCallsStarted ?? 'unknown'}):`,
        error instanceof Error ? error.stack : String(error),
      );
      const failure: DiscoveryFailure = {
        code: DISCOVERY_FAILED_CODE,
        message:
          error instanceof PaidDeadlineExceededError
            ? 'Competitor discovery ran out of time'
            : 'Competitor discovery failed',
        paidCallsStarted,
      };
      throw new RpcException(failure);
    }
  }

  @MessagePattern('analyze_competitor')
  async analyzeCompetitor(data: {
    competitorDomain: string;
    deadlineAt?: number;
    businessContext: BusinessContext;
    serpMetadata?: {
      title?: string;
      snippet?: string;
      rating?: number;
      reviewCount?: number;
      priceRange?: {
        min: number;
        max: number;
        currency: string;
      };
    };
  }): Promise<CompetitorInsight> {
    this.logger.debug(
      `Received 'analyze_competitor' message for ${data.competitorDomain}`,
    );
    this.logger.debug({
      businessType: data.businessContext.businessType,
      productsCount: data.businessContext.products?.length || 0,
      hasSerpMetadata: !!data.serpMetadata,
    });
    this.logger.debug('Business context details:', {
      domain: data.businessContext.domain,
      businessType: data.businessContext.businessType,
      products: data.businessContext.products || [],
      productsPreview: data.businessContext.products?.slice(0, 3) || [],
    });

    try {
      const result = await runWithPaidDeadline(data.deadlineAt, (deadline) =>
        this.competitorService.analyzeCompetitor(
          data.competitorDomain,
          data.businessContext,
          data.serpMetadata,
          createAnalysisBudget(deadline),
        ),
      );

      this.logger.debug(
        `Completed 'analyze_competitor' for ${data.competitorDomain}, found ${result.products?.length || 0} products`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing 'analyze_competitor' for ${data.competitorDomain}:`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
