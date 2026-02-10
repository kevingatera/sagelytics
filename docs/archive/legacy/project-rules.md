# Sagelytics Project Rules

## Project Overview
Sagelytics is a competitive intelligence platform that helps businesses monitor and analyze competitor pricing, products, and market positioning.

## Technology Stack

### Frontend (Next.js)
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 18.3
- **Styling**: Tailwind CSS with custom components
- **Authentication**: NextAuth v5 (Beta)
- **State Management**: TanStack Query (React Query)
- **Type-Safe API**: tRPC
- **Charts**: Chart.js with react-chartjs-2
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives with shadcn/ui

### Backend Services
- **Database**: PostgreSQL with Drizzle ORM
- **Microservices**: NestJS with modular architecture
- **Message Queue**: Multiple protocols supported (RabbitMQ, Kafka, NATS, Redis)
- **Caching**: Redis with Upstash for rate limiting
- **AI/LLM**: Langchain with Groq integration

### Development Tools
- **Package Manager**: pnpm 9.11.0
- **Language**: TypeScript 5.5+
- **Linting**: ESLint with TypeScript parser
- **Formatting**: Prettier with Tailwind plugin
- **Monorepo Structure**: Shared types package

## Architecture

### Directory Structure
```
/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── lib/             # Utilities and services
│   ├── server/          # Server-side code (tRPC, auth, db)
│   ├── microservices/   # NestJS microservices
│   └── types/           # TypeScript type definitions
├── packages/
│   └── types/           # Shared types between frontend and backend
└── public/              # Static assets
```

### Microservices Architecture
- **API Gateway**: Main entry point at port 3001
- **Website Service**: Handles web scraping and content extraction
- **Competitor Service**: Analyzes competitor data and insights
- **Smart Crawler**: Intelligent web crawling with robots.txt compliance

## Key Features

### Core Functionality
1. **Competitor Discovery**: Automated discovery of competitors using search APIs
2. **Price Monitoring**: Real-time tracking of competitor pricing
3. **Product Matching**: AI-powered matching of similar products across competitors
4. **Business Intelligence**: Analysis of competitor strategies and market positioning
5. **Dashboard Analytics**: Visual representation of competitive data

### Data Models
- **Users**: Authentication and profile management
- **Competitors**: Domain-based competitor tracking
- **Products**: Product catalog with pricing history
- **Insights**: AI-generated competitive intelligence
- **Platform Metrics**: Performance data from various listing platforms

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Use functional components with hooks in React
- Implement proper error handling and logging

### Database Schema
- Tables use `sg_` prefix (e.g., `sg_user`, `sg_competitor`)
- UUID primary keys for most entities
- Timestamp fields for audit trails
- JSONB for flexible metadata storage

### API Design
- tRPC for type-safe client-server communication
- Protected procedures require authentication
- Input validation with Zod schemas
- Consistent error handling

### Microservices Communication
- Message-based communication between services
- Event-driven architecture for real-time updates
- Proper error handling and retry mechanisms

## Security Considerations
- Environment-based configuration (no hardcoded secrets)
- Rate limiting on API endpoints
- Authentication required for sensitive operations
- Input sanitization for web scraping

## Deployment
- Docker Compose for local development
- Health checks for all services
- Graceful shutdown handling
- Environment-specific configurations

## User Interface Guidelines
- Mobile-first responsive design required
- Accessible UI with proper ARIA attributes
- Consistent error handling and feedback 

## Competitor Analysis Guidelines
- System must be industry-agnostic and work for any business type globally
- Avoid hardcoding specific industries or geographic regions
- Use dynamic inference from business content to determine context
- Let AI models intelligently extract location and business type
- Competitor discovery should adapt to any industry without assumptions
- Product matching algorithms must work across diverse product types

❤️
