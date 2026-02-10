# LLM Prompts for Competitor Price Monitoring App

## Frontend UI Prompts (for Lovable)

### 1. Authentication UI
```
Create a modern authentication UI for a SaaS application using Next.js, Tailwind CSS, and Shadcn UI components. Include:
1. Login page with email/password and social login options
2. Registration page with basic information collection
3. Password reset functionality
4. Account setup wizard for first-time users
Use a clean, professional design with a primary color scheme of blues and whites. Make it responsive for all screen sizes.
```

### 2. Main Dashboard UI
```
Design a competitor price monitoring dashboard for small businesses using Next.js, Tailwind CSS, and Shadcn components. Include:
1. Header with app logo, navigation, notifications bell, and user profile dropdown
2. Sidebar with navigation links (Dashboard, Competitors, Products, Settings, etc.)
3. Main content area with:
   - Summary cards showing total competitors tracked, price changes today, and average price movement
   - Recent price changes table with competitor name, product, old price, new price, and percentage change
   - Price trends graph showing competitor pricing over time with toggle for different time periods
   - Notification center showing recent alerts
4. Support both light and dark mode
Make it clean, data-focused, and intuitive for business users.
```

### 3. Competitor Overview UI
```
Create a competitor overview page for a price monitoring app using Next.js, Tailwind CSS, and Shadcn UI. Include:
1. List/grid view of all competitors with:
   - Competitor name and logo
   - Website link
   - Number of products tracked
   - Latest price change indicator (up/down with percentage)
   - Quick action buttons (view details, disable tracking)
2. Sorting and filtering options
3. Search functionality
4. Ability to group competitors by category or industry
5. Add new competitor button
Design should be clean, information-dense but not cluttered, and optimized for quick scanning of competitive landscape.
```

### 4. Product Input Form UI
```
Design a user-friendly form for adding products to track in a competitor monitoring app using Next.js, Tailwind CSS, and Shadcn UI. Include:
1. Input for the user's own product URL
2. Product name field (auto-populated if possible from URL)
3. Category/tags selection for grouping
4. Price input for user's current pricing
5. Product image upload or URL
6. Toggle for whether to automatically find competitors or manually add them
7. If automatic, a section showing identified competitors with checkboxes to include/exclude them
8. Form validation with helpful error messages
9. Progress indicator for multi-step process
Make the interface intuitive with clear guidance on each step.
```

### 5. Notification Settings UI
```
Create a notification settings page for a price monitoring application using Next.js, Tailwind CSS, and Shadcn UI. Include:
1. Global notification preferences with toggles for:
   - In-app notifications
   - Email notifications
   - Daily digest emails
2. Threshold configuration for price change alerts:
   - Percentage change slider (e.g., notify me of changes greater than 5%)
   - Absolute amount change option
3. Notification schedule options:
   - Immediate alerts for significant changes
   - Daily/weekly summary options
4. Competitor-specific notification settings section where users can override global settings for specific competitors
5. Email template previews
Design should be clean, intuitive, and focused on user control over their notification experience.
```

### 6. Price Change Visualization UI
```
Design data visualization components for a competitor price monitoring app using Next.js, Tailwind CSS, Shadcn UI, and a charting library like Chart.js or Recharts. Include:
1. Line chart showing price trends over time for multiple competitors with:
   - Interactive tooltip on hover
   - Ability to toggle competitors on/off
   - Time range selector (7 days, 30 days, 3 months, 1 year)
   - Annotations for significant price changes
2. Bar chart comparing current prices across competitors
3. Heat map showing frequency and magnitude of price changes
4. Price change distribution chart
5. Export options for charts (PNG, CSV)
Make the visualizations clean, insightful, and business-appropriate with consistent styling throughout.
```

### 7. Integrations UI
```
Create an integrations page for a competitor price monitoring app using Next.js, Tailwind CSS, and Shadcn UI. Include:
1. Categorized list of available integrations:
   - E-commerce platforms (Shopify, WooCommerce, etc.)
   - CRM systems (Salesforce, HubSpot)
   - Communication tools (Slack, Teams)
   - Analytics platforms (Google Analytics, Tableau)
2. For each integration:
   - Logo and name
   - Brief description of functionality
   - Connect/Disconnect button
   - Configuration options when connected
3. Search and filter functionality
4. Integration status indicators
5. Setup wizard for complex integrations
Design should be clean, organized by categories, with clear visual indicators of connection status.
```

### 8. Reporting Dashboard UI
```
Design an analytics and reporting dashboard for a competitor price monitoring app using Next.js, Tailwind CSS, Shadcn UI, and appropriate charting libraries. Include:
1. Report generation section with:
   - Date range selector
   - Competitor selection (multi-select)
   - Product category filters
   - Report type options (price trends, competitive analysis, etc.)
   - Export format options (PDF, CSV, Excel)
2. Saved reports section showing previously generated reports
3. Automated report scheduling configuration
4. Key metrics dashboard with:
   - Price volatility by competitor
   - Market position chart (your price vs. market average)
   - Pricing opportunity indicators
   - Historical pricing strategy effectiveness
Create a clean, data-focused interface that helps business users derive actionable insights from competitor data.
```

## Backend Prompts (for Cursor)

### 1. Authentication System
```
Create a complete authentication system for a Next.js application using NextAuth.js with tRPC and PostgreSQL. Include:
1. User schema with email, password (hashed), name, role, and profile data
2. Authentication routes for login, register, password reset
3. JWT-based session management
4. OAuth providers integration (Google, GitHub)
5. Role-based authorization middleware
6. Session validation and refresh logic
7. Security features (rate limiting, CSRF protection)
Ensure the code follows best practices for security and adheres to the T3 stack architecture.
```

### 2. Competitor Identification Service
```
Create a service that uses an LLM API (like Perplexity or OpenAI) to identify competitors based on a user-provided website and product. Include:
1. API wrapper for the chosen LLM service with proper error handling
2. Function to extract key product information from a URL
3. Prompt engineering for optimal competitor identification
4. Response parsing to extract competitor names and URLs
5. Validation and filtering of identified competitors
6. Rate limiting and caching mechanisms
7. Database schema for storing identified competitors
8. tRPC endpoint to expose this functionality to the frontend
Ensure the code is robust, includes error handling, and follows clean architecture principles.
```

### 3. Price Scraping System
```
Create a web scraping system for monitoring product prices from competitor websites. Include:
1. Scraping engine using Puppeteer or Playwright that can:
   - Navigate to product pages
   - Extract pricing information
   - Handle different price formats and currencies
   - Detect sales and regular prices
2. Scheduling system for regular price checks
3. Proxy rotation and user agent randomization for avoiding blocks
4. Error handling for when site structures change
5. Database schema for storing price history
6. Detection algorithm for significant price changes
7. Rate limiting to respect websites' resources
8. tRPC endpoints to manage scraping tasks and retrieve results
Ensure the code is maintainable, extensible for different website structures, and ethically respectful of target websites.
```

### 4. Notification System
```
Create a notification system for a price monitoring application using tRPC, PostgreSQL, and appropriate email/notification libraries. Include:
1. Database schema for storing user notification preferences and notification history
2. Service for detecting notification-worthy events (price changes beyond thresholds)
3. Notification dispatcher supporting:
   - In-app notifications stored in database
   - Email notifications using a service like Resend or SendGrid
   - Webhook deliveries for third-party integrations
4. Daily digest email generation and delivery
5. Notification preferences management
6. Read/unread status tracking
7. Notification grouping for related events
8. tRPC endpoints for managing preferences and retrieving notifications
Ensure the system is scalable, handles delivery failures gracefully, and respects user preferences.
```

### 5. Data Analysis Service
```
Create a data analysis service for a competitor price monitoring application. Include:
1. Functions for calculating:
   - Price trends over time
   - Market position analysis
   - Price volatility metrics
   - Correlation between your prices and competitor prices
2. Anomaly detection for unusual price changes
3. Forecasting service to predict future price movements
4. Opportunity detection algorithm to identify potential pricing optimizations
5. Performance impact analysis (how price changes affected metrics)
6. Data aggregation for reporting
7. tRPC endpoints to expose these analyses to the frontend
8. Caching mechanism for expensive calculations
Ensure the code is efficient, statistically sound, and provides actionable insights from the price data.
```

### 6. Export and Reporting System
```
Create an export and reporting system for a competitor price monitoring application using appropriate libraries for PDF, CSV, and Excel generation. Include:
1. Report template engine for generating:
   - PDF reports with charts and analysis
   - CSV/Excel data exports with detailed price history
   - JSON API responses for custom integrations
2. Scheduling system for automated report generation
3. Database schema for storing report configurations and history
4. Email delivery service for scheduled reports
5. Report customization options (date ranges, competitors, metrics)
6. Caching mechanism for recently generated reports
7. tRPC endpoints for report generation, retrieval, and management
Ensure the system handles large datasets efficiently and produces professional-looking output.
```

### 7. Integration Framework
```
Create an integration framework for a competitor price monitoring app that can connect with external services. Include:
1. Common interface for all integrations
2. Implementation for key integrations:
   - E-commerce platforms (Shopify API integration)
   - CRM systems (basic Salesforce connector)
   - Communication tools (Slack webhook integration)
   - BI tools (data export adapters)
2. Authentication handling for OAuth-based services
3. Webhook receivers for bidirectional integrations
4. Configuration storage in database
5. Activity logging for integration events
6. Error handling and retry mechanisms
7. Rate limiting to respect API quotas
8. tRPC endpoints for managing integrations
Design the system to be easily extensible for new integrations with minimal boilerplate.
```

### 8. System-wide Backend Infrastructure
```
Create the core infrastructure components for a T3 stack application focusing on scalability and maintainability. Include:
1. PostgreSQL schema with all necessary models:
   - Users and authentication
   - Competitors and products
   - Price history and changes
   - Notifications and preferences
   - Reports and exports
   - Integration configurations
2. Base tRPC router setup with:
   - Authentication middleware
   - Error handling
   - Rate limiting
   - Logging
3. Background job processing system for:
   - Scheduled scraping
   - Report generation
   - Email sending
4. Caching layer implementation
5. Logging and monitoring setup
6. Environment configuration management
7. Database migration strategy
8. API documentation generation
Ensure the infrastructure follows best practices for the T3 stack and is designed for future scaling.
```

## Implementation Strategy

When using these prompts, follow this sequence:

1. Start with the system-wide backend infrastructure to establish your data model and core systems
2. Implement authentication on both frontend and backend
3. Build the main dashboard UI and competitor identification features
4. Implement the price scraping system and competitor overview
5. Add notification systems on both ends
6. Develop visualization and reporting features
7. Finally, add integrations and advanced features

Remember to:
- Verify each component works before moving to the next
- Ensure frontend and backend components are properly connected via tRPC
- Test extensively, especially the scraping functionality which can be fragile
- Document your API as you go to make integration easier
