# Sagelytics Monitoring Implementation Plan

## Project Complexity: Level 3 (Intermediate)
**Rationale**: This is a comprehensive monitoring system implementation that requires database schema changes, microservice enhancements, notification systems, and UI components with data visualization. Real-time features are excluded to reduce complexity.

## Overview
Implement a complete monitoring system for Sagelytics that tracks competitor prices and product changes using scheduled monitoring, with historical data storage, email notifications, and analytics dashboard.

## Current State Analysis

### Existing Components
- ✅ Basic monitoring UI (`/monitoring` page with tabs)
- ✅ `AddMonitoringTaskForm` and `AddMonitoringTaskContainer` components
- ✅ `MonitoringTasksPanel` with mock data
- ✅ `PriceMonitoringWorker` service (in-memory only)
- ✅ Basic API endpoint `/api/product-monitor`
- ✅ Microservice client with monitoring methods
- ✅ **Perplexity integration** for competitor discovery with product URLs
- ✅ **WebsiteDiscoveryService** for direct website crawling and price extraction
- ❌ **Missing**: Database schema for monitoring tasks
- ❌ **Missing**: Historical price data storage
- ❌ **Missing**: Email notifications
- ❌ **Missing**: Price change alerts
- ❌ **Missing**: Monitoring analytics and insights

### Key Discovery: Existing Competitor Acquisition System
The application already has a sophisticated competitor discovery system:

1. **Perplexity Integration**: Uses Perplexity API to discover competitors and their products with specific details
2. **Product URL Discovery**: The `WebsiteDiscoveryService` can extract specific product URLs and pricing information
3. **Direct Website Crawling**: Existing capabilities to crawl competitor websites directly without relying on external APIs

This means we can leverage the existing system to get specific product URLs for monitoring, reducing costs by using direct website crawling instead of repeated Perplexity queries.

## Requirements Analysis

### Core Monitoring Features
1. **Automated Price Monitoring**
   - Schedule-based monitoring (hourly, daily, custom)
   - Direct website crawling for price tracking
   - Product matching using existing Perplexity integration
   - Historical price data collection and storage

2. **Monitoring Task Management**
   - Create, update, delete monitoring tasks
   - Enable/disable monitoring for specific competitors
   - Bulk operations for multiple products
   - Task status and health monitoring

3. **Alerting & Notifications**
   - Price change alerts (increase/decrease thresholds)
   - New competitor product detection
   - Monitoring task failure notifications
   - Email notification system

4. **Analytics & Insights**
   - Price trend analysis and visualization
   - Competitor pricing strategy insights
   - Market positioning recommendations
   - Historical data export capabilities

### Cost Optimization Strategy
- **Initial Discovery**: Use Perplexity to discover competitors and get initial product URLs
- **Ongoing Monitoring**: Use direct website crawling to monitor specific product URLs
- **Reduced API Costs**: Minimize Perplexity usage by storing discovered product URLs for direct monitoring

## Architecture Considerations

### Database Schema Requirements
- `monitoring_tasks` table for persistent task storage
- `price_history` table for historical price data
- `monitoring_alerts` table for alert configurations
- `notification_logs` table for tracking sent notifications

### Microservice Enhancements
- Enhanced `PriceMonitoringWorker` with database persistence
- Email notification service
- Analytics processing service
- Integration with existing Perplexity and WebsiteDiscovery services

### Frontend Components
- Monitoring dashboard with scheduled updates
- Price trend visualization charts
- Alert configuration interface
- Monitoring task management interface

## Implementation Strategy

### Phase 1: Database Foundation (Level 3)
**Priority**: Critical
**Estimated Effort**: 2-3 days

#### Database Schema Implementation
1. **Create monitoring tables schema**
   - `monitoring_tasks`: Store persistent monitoring configurations with competitor URLs
   - `price_history`: Historical price data with timestamps
   - `monitoring_alerts`: Alert rules and thresholds
   - `notification_logs`: Track notification delivery

2. **Database migrations**
   - Create new tables with proper indexes
   - Add foreign key relationships
   - Set up data retention policies

#### Files to Create/Modify:
- `src/server/db/schema.ts` - Add monitoring tables
- `drizzle/migrations/` - New migration files
- `src/server/db/queries/monitoring.ts` - Database query functions

### Phase 2: Enhanced Microservices (Level 3)
**Priority**: Critical
**Estimated Effort**: 3-4 days

#### Monitoring Service Enhancements
1. **Persistent monitoring tasks**
   - Replace in-memory storage with database
   - Store discovered product URLs from Perplexity
   - Add task lifecycle management
   - Implement task health monitoring

2. **Direct website monitoring**
   - Leverage existing `WebsiteDiscoveryService` for price extraction
   - Use stored product URLs for direct monitoring
   - Price change detection and alerting
   - Minimize Perplexity API usage

3. **Notification service**
   - Email notification system
   - Notification template system
   - Alert delivery tracking

#### Files to Create/Modify:
- `src/microservices/src/website/services/price-monitoring-worker.ts` - Database integration and URL-based monitoring
- `src/microservices/src/website/services/notification.service.ts` - New notification service
- `src/microservices/src/website/services/analytics.service.ts` - New analytics service
- `src/microservices/src/website/website.controller.ts` - Enhanced endpoints

### Phase 3: API Layer Enhancement (Level 3)
**Priority**: High
**Estimated Effort**: 2 days

#### API Endpoints
1. **Monitoring task CRUD operations**
   - Create, read, update, delete monitoring tasks
   - Bulk operations for multiple tasks
   - Task status and health endpoints

2. **Historical data endpoints**
   - Price history retrieval with filtering
   - Analytics data aggregation
   - Export functionality

3. **Alert management endpoints**
   - Configure price change alerts
   - Notification preferences
   - Alert history and logs

#### Files to Create/Modify:
- `src/app/api/monitoring-tasks/route.ts` - Task management endpoints
- `src/app/api/price-history/route.ts` - Historical data endpoints
- `src/app/api/alerts/route.ts` - Alert management endpoints
- `src/server/api/routers/monitoring.ts` - tRPC router for monitoring

### Phase 4: Frontend Dashboard (Level 3)
**Priority**: High
**Estimated Effort**: 3-4 days

#### Enhanced Monitoring Interface
1. **Monitoring dashboard**
   - Scheduled price updates display
   - Task status monitoring
   - Quick action buttons
   - Competitor product URL management

2. **Price trend visualization**
   - Interactive charts using Chart.js/Recharts
   - Historical price comparison
   - Trend analysis insights

3. **Alert configuration interface**
   - Price threshold settings
   - Email notification preferences
   - Alert rule management

#### Files to Create/Modify:
- `src/components/monitoring/MonitoringDashboard.tsx` - Main dashboard component
- `src/components/monitoring/PriceTrendChart.tsx` - Price visualization
- `src/components/monitoring/AlertConfigForm.tsx` - Alert configuration
- `src/components/monitoring/TaskStatusPanel.tsx` - Task health monitoring
- `src/components/monitoring/ProductUrlManager.tsx` - Manage discovered product URLs
- `src/app/monitoring/page.tsx` - Enhanced monitoring page

### Phase 5: Notifications & Alerts (Level 3)
**Priority**: Medium
**Estimated Effort**: 2-3 days

#### Notification System
1. **Email notifications**
   - Price change alerts
   - Task failure notifications
   - Weekly monitoring reports
   - Notification templates

2. **Alert rule engine**
   - Configurable price thresholds
   - Percentage-based alerts
   - Custom alert conditions

3. **Notification management**
   - Email delivery tracking
   - Notification history
   - Unsubscribe handling

#### Files to Create/Modify:
- `src/components/notifications/AlertRuleForm.tsx` - Alert configuration
- `src/lib/services/notification-client.ts` - Notification service client
- `src/app/api/notifications/route.ts` - Notification endpoints
- `src/components/monitoring/NotificationSettings.tsx` - Email preferences

### Phase 6: Analytics & Insights (Level 4)
**Priority**: Medium
**Estimated Effort**: 3-4 days

#### Analytics Dashboard
1. **Price trend analysis**
   - Market trend identification
   - Competitor pricing patterns
   - Seasonal price variations

2. **Competitive insights**
   - Market positioning analysis
   - Pricing strategy recommendations
   - Opportunity identification

3. **Reporting system**
   - Automated weekly/monthly reports
   - Custom report generation
   - Data export capabilities

#### Files to Create/Modify:
- `src/components/analytics/PriceAnalyticsDashboard.tsx` - Analytics interface
- `src/components/analytics/CompetitiveInsights.tsx` - Insights display
- `src/components/analytics/ReportGenerator.tsx` - Report generation
- `src/app/analytics/page.tsx` - Analytics page

## Detailed Implementation Steps

### Database Schema (Phase 1)

#### 1. Monitoring Tasks Table
```sql
CREATE TABLE sg_monitoring_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES sg_user(id),
  competitor_domain TEXT NOT NULL,
  product_urls JSONB NOT NULL, -- Store discovered product URLs and metadata
  frequency VARCHAR(50) NOT NULL, -- Cron expression
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- active, paused, failed
  discovery_source VARCHAR(20) DEFAULT 'perplexity', -- perplexity, manual, sitemap
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Price History Table
```sql
CREATE TABLE sg_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_task_id UUID REFERENCES sg_monitoring_tasks(id),
  product_name TEXT NOT NULL,
  product_url TEXT NOT NULL, -- Direct URL to the product page
  price DECIMAL(10,2),
  currency VARCHAR(3),
  recorded_at TIMESTAMP DEFAULT NOW(),
  change_percentage DECIMAL(5,2),
  previous_price DECIMAL(10,2),
  extraction_method VARCHAR(20) DEFAULT 'direct_crawl' -- direct_crawl, api, manual
);
```

#### 3. Monitoring Alerts Table
```sql
CREATE TABLE sg_monitoring_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES sg_user(id),
  monitoring_task_id UUID REFERENCES sg_monitoring_tasks(id),
  alert_type VARCHAR(50) NOT NULL, -- price_increase, price_decrease, new_product
  threshold_value DECIMAL(10,2),
  threshold_type VARCHAR(20), -- percentage, absolute
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Microservice Enhancements (Phase 2)

#### Enhanced PriceMonitoringWorker
- Database persistence for monitoring tasks with product URLs
- Integration with existing WebsiteDiscoveryService for price extraction
- Improved error handling and retry logic
- Price change detection and alerting
- Integration with notification service

#### New Notification Service
- Email notification delivery
- Notification template system
- Alert delivery tracking
- Integration with existing email infrastructure

#### Leveraging Existing Services
- **Perplexity Integration**: Use for initial competitor and product discovery
- **WebsiteDiscoveryService**: Use for ongoing price monitoring of discovered URLs
- **Cost Optimization**: Store discovered URLs to minimize Perplexity API usage

### API Enhancements (Phase 3)

#### Monitoring Tasks API
- CRUD operations for monitoring tasks
- Bulk task management
- Task scheduling and status updates
- Health monitoring endpoints

#### Price History API
- Historical data retrieval with filtering
- Price trend analysis endpoints
- Data aggregation for analytics
- Export functionality

## Dependencies & Integration Points

### External Services
- **Email Service**: SendGrid/AWS SES for email notifications
- **Analytics**: Chart.js or Recharts for data visualization
- **Scheduling**: Enhanced cron job management
- **Existing Integrations**: Perplexity API, Spider API for web crawling

### Database Considerations
- **Indexing**: Proper indexes for time-series queries
- **Data Retention**: Policies for historical data cleanup
- **Performance**: Optimized queries for large datasets
- **Backup**: Regular backups of monitoring data

## Challenges & Mitigations

### Technical Challenges
1. **URL Discovery**: Efficiently discover and store specific product URLs from competitors
2. **Data Volume**: Efficient storage and querying of historical price data
3. **Reliability**: Robust error handling and retry mechanisms for web crawling
4. **Performance**: Optimized database queries and caching strategies
5. **Cost Management**: Balance between Perplexity usage and direct crawling accuracy

### Business Logic Challenges
1. **Product Matching**: Improved algorithms for accurate product matching
2. **Price Change Detection**: Smart thresholds to avoid noise
3. **Alert Fatigue**: Intelligent alert grouping and prioritization
4. **Data Quality**: Validation and cleaning of scraped data

## Testing Strategy

### Unit Tests
- Database query functions
- Monitoring service logic
- Notification delivery
- Price calculation algorithms

### Integration Tests
- API endpoint functionality
- Microservice communication
- Database operations
- External service integrations

### E2E Tests
- Complete monitoring workflow
- Alert generation and delivery
- Dashboard functionality
- User interaction flows

## Creative Phase Components

### 🎨 UI/UX Design Requirements
1. **Monitoring Dashboard Layout**
   - Scheduled data visualization design
   - Interactive chart components
   - Status indicator design patterns
   - Product URL management interface

2. **Alert Configuration Interface**
   - Intuitive threshold setting UI
   - Visual feedback for alert rules
   - Email notification preference interface

3. **Analytics Visualization**
   - Price trend chart designs
   - Competitive analysis layouts
   - Report generation interface

### 🏗️ Architecture Design Decisions
1. **URL Discovery and Storage Strategy**
   - Perplexity integration for initial discovery
   - JSONB storage for product URL metadata
   - Direct crawling optimization

2. **Data Storage Optimization**
   - Time-series data structure for price history
   - Indexing strategy for performance
   - Data retention and archival policies

3. **Notification System Architecture**
   - Email-based notification delivery
   - Template system design
   - Delivery status tracking

4. **Cost Optimization Strategy**
   - Minimize Perplexity API usage after initial discovery
   - Leverage existing WebsiteDiscoveryService
   - Efficient URL-based monitoring

## Verification Checklist

### Phase 1 Completion
- [ ] Database schema created and migrated
- [ ] Database query functions implemented
- [ ] Data relationships properly established
- [ ] Indexes created for performance

### Phase 2 Completion
- [ ] Monitoring worker enhanced with database persistence
- [ ] Notification service implemented
- [ ] Real-time price tracking functional
- [ ] Error handling and retry logic in place

### Phase 3 Completion
- [ ] All API endpoints implemented and tested
- [ ] tRPC router configured
- [ ] Authentication and authorization in place
- [ ] API documentation updated

### Phase 4 Completion
- [ ] Enhanced monitoring dashboard functional
- [ ] Price trend visualization working
- [ ] Alert configuration interface complete
- [ ] Product URL management interface working

### Phase 5 Completion
- [ ] Email notifications configured and working
- [ ] Alert rules engine functional
- [ ] Notification delivery tracking implemented
- [ ] Email preferences management working

### Phase 6 Completion
- [ ] Analytics dashboard complete
- [ ] Competitive insights generated
- [ ] Report generation functional
- [ ] Data export capabilities working

## Next Mode Recommendation

**CREATIVE MODE** - This implementation requires significant design decisions for:
1. Product URL discovery and storage strategy using existing Perplexity integration
2. Monitoring dashboard UI/UX design for scheduled updates
3. Price trend visualization and analytics interface
4. Database schema optimization for time-series data and URL storage
5. Cost optimization strategy balancing Perplexity usage with direct crawling

The creative phase should focus on designing the URL discovery workflow, monitoring dashboard layout, alert configuration interface, and determining the optimal architecture for cost-effective monitoring using existing services.

## Key Implementation Notes

### Leveraging Existing Infrastructure
- **Perplexity Service**: Already integrated and working for competitor discovery
- **WebsiteDiscoveryService**: Sophisticated crawling capabilities with price extraction
- **Database Schema**: Existing competitor and product tables to build upon
- **UI Components**: Basic monitoring interface already in place

### Cost Optimization Approach
1. **Initial Setup**: Use Perplexity to discover competitors and extract product URLs
2. **Ongoing Monitoring**: Store URLs in database and use direct crawling
3. **Reduced API Costs**: Minimize repeated Perplexity queries by caching discovered data
4. **Fallback Strategy**: Use Perplexity only when direct crawling fails or for new product discovery 