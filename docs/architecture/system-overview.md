# System Overview

Sagelytics is split into a web app (Next.js/tRPC) and a Nest microservice layer for discovery/analysis workloads.

## Runtime Topology

```mermaid
graph TB
    subgraph Frontend
        LP[Landing Page]
        OB[Onboarding]
        DB[Dashboard]
        subgraph Components
            PC[Price Comparison]
            AI[AI Insights]
            PS[Pricing Strategy]
            SO[Sales Overview]
        end
    end

    subgraph Backend
        TR[tRPC Router]
        subgraph Services
            MA[Model Manager]
            MS[Metrics Service]
            WD[Website Discovery]
            CA[Competitor Analysis]
            CD[Competitor Discovery]
        end

        subgraph Database
            DZ[Drizzle ORM]
            PG[(PostgreSQL)]
        end
    end

    subgraph External
        LLM[LLM Models]
        SP[Spider Service]
        VS[ValueSERP API]
    end

    LP --> OB
    OB --> DB
    DB --> Components
    Components --> TR

    TR --> Services
    Services --> DZ
    DZ --> PG

    MA --> LLM
    WD --> SP
    CD --> VS
    CD --> LLM

    CA --> MA
    CD --> CA
    CD --> WD
```

## Important Integration Notes

- Next.js communicates with microservices through the Nest TCP client (`@nestjs/microservices`).
- Port `3001` is TCP transport, not HTTP.
- Discovery is designed to degrade gracefully when Redis cache/progress paths are unavailable.
