import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTableCreator,
  primaryKey,
  text,
  timestamp,
  varchar,
  boolean,
  jsonb,
  uuid,
  unique,
  numeric,
} from 'drizzle-orm/pg-core';
import { type AdapterAccount } from 'next-auth/adapters';

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `sg_${name}`);

export const users = createTable('user', {
  id: varchar('id', { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('email_verified', {
    mode: 'date',
    precision: 3,
    withTimezone: true,
  }).default(sql`CURRENT_TIMESTAMP`),
  image: varchar('image', { length: 255 }),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  password: varchar('password', { length: 255 }),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accounts = createTable(
  'account',
  {
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar('type', { length: 255 }).$type<AdapterAccount['type']>().notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('provider_account_id', {
      length: 255,
    }).notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index('account_user_id_idx').on(account.userId),
  }),
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  'session',
  {
    sessionToken: varchar('session_token', { length: 255 }).notNull().primaryKey(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id),
    expires: timestamp('expires', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
  },
  (session) => ({
    userIdIdx: index('session_user_id_idx').on(session.userId),
  }),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  'verification_token',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const userOnboarding = createTable('user_onboarding', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id),
  companyDomain: varchar('company_domain', { length: 255 }).notNull(),
  productCatalogUrl: text('product_catalog_url'),
  businessType: varchar('business_type').notNull(),
  metricConfig: text('metric_config').$type<Record<string, boolean>>(),
  completed: boolean('completed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  identifiedCompetitors: text('identified_competitors').$type<string[]>(),
});

export const businessTypes = createTable('business_type', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  requiredMetrics: text('required_metrics').$type<string[]>(),
});

export const metricConfig = createTable(
  'metric_config',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id),
    businessType: varchar('business_type').references(() => businessTypes.id),
    enabledMetrics: text('enabled_metrics').$type<string[]>(),
    lastUpdated: timestamp('last_updated').defaultNow(),
  },
  (table) => ({
    businessTypeIdx: index('metric_config_business_type_idx').on(table.businessType),
  }),
);

export type PlatformData = {
  platform: string;
  url: string;
  metrics: {
    sales?: number;
    reviews?: number;
    rating?: number;
    priceRange?: {
      min: number;
      max: number;
      currency: string;
    };
    lastUpdated: string;
  };
};

export type CompetitorMetadata = {
  matchScore: number;
  matchReasons: string[];
  suggestedApproach: string;
  dataGaps: string[];
  lastAnalyzed: string;
  businessName?: string;
  platforms: PlatformData[];
  products: Array<{
    name: string;
    url: string;
    price: number;
    currency: string;
    platform: string;
    matchedProducts: Array<{
      name: string;
      url: string | null;
      matchScore: number;
      priceDiff: number | null;
    }>;
    lastUpdated: string;
  }>;
};

export const competitors = createTable('competitors', {
  id: uuid('id').defaultRandom().primaryKey(),
  domain: text('domain').notNull().unique(),
  metadata: jsonb('metadata').$type<CompetitorMetadata>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userProducts = createTable('user_products', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 255 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_user_products_user').on(table.userId),
  skuIdx: index('idx_user_products_sku').on(table.sku),
  nameIdx: index('idx_user_products_name').on(table.name),
  userSkuUnique: unique('uc_user_sku').on(table.userId, table.sku),
}));

export const userCompetitors = createTable(
  'user_competitors',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id),
    competitorId: uuid('competitor_id')
      .notNull()
      .references(() => competitors.id),
    relationshipStrength: integer('relationship_strength').default(1),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userCompetitorUnique: unique('uc_user_competitor').on(table.userId, table.competitorId),
    userIdIdx: index('idx_uc_user').on(table.userId),
    competitorIdIdx: index('idx_uc_competitor').on(table.competitorId),
  }),
);

export const competitorsRelations = relations(competitors, ({ many }) => ({
  userCompetitors: many(userCompetitors),
}));

export const userProductsRelations = relations(userProducts, ({ one }) => ({
  user: one(users, {
    fields: [userProducts.userId],
    references: [users.id],
  }),
}));

export const userCompetitorsRelations = relations(userCompetitors, ({ one }) => ({
  competitor: one(competitors, {
    fields: [userCompetitors.competitorId],
    references: [competitors.id],
  }),
  user: one(users, {
    fields: [userCompetitors.userId],
    references: [users.id],
  }),
}));

// Monitoring Tables
export const monitoringTasks = createTable('monitoring_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id),
  competitorDomain: text('competitor_domain').notNull(),
  productUrls: jsonb('product_urls').$type<Array<{
    id: string;
    name: string;
    url: string;
    price?: number;
    currency?: string;
  }>>().notNull(),
  frequency: varchar('frequency', { length: 50 }).notNull(), // Cron expression
  enabled: boolean('enabled').default(true),
  lastRun: timestamp('last_run'),
  nextRun: timestamp('next_run'),
  status: varchar('status', { length: 20 }).default('active'), // active, paused, failed
  discoverySource: varchar('discovery_source', { length: 20 }).default('perplexity'), // perplexity, manual, sitemap
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_monitoring_tasks_user').on(table.userId),
  statusIdx: index('idx_monitoring_tasks_status').on(table.status),
  enabledIdx: index('idx_monitoring_tasks_enabled').on(table.enabled),
  nextRunIdx: index('idx_monitoring_tasks_next_run').on(table.nextRun),
}));

export const priceHistory = createTable('price_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  monitoringTaskId: uuid('monitoring_task_id')
    .notNull()
    .references(() => monitoringTasks.id, { onDelete: 'cascade' }),
  productName: text('product_name').notNull(),
  productUrl: text('product_url').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  changePercentage: numeric('change_percentage', { precision: 5, scale: 2 }),
  previousPrice: numeric('previous_price', { precision: 10, scale: 2 }),
  extractionMethod: varchar('extraction_method', { length: 20 }).default('direct_crawl'), // direct_crawl, api, manual
}, (table) => ({
  taskIdIdx: index('idx_price_history_task').on(table.monitoringTaskId),
  recordedAtIdx: index('idx_price_history_recorded_at').on(table.recordedAt),
  productUrlIdx: index('idx_price_history_product_url').on(table.productUrl),
}));

export const monitoringAlerts = createTable('monitoring_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id),
  monitoringTaskId: uuid('monitoring_task_id')
    .references(() => monitoringTasks.id, { onDelete: 'cascade' }),
  alertType: varchar('alert_type', { length: 50 }).notNull(), // price_increase, price_decrease, new_product
  thresholdValue: numeric('threshold_value', { precision: 10, scale: 2 }),
  thresholdType: varchar('threshold_type', { length: 20 }), // percentage, absolute
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_monitoring_alerts_user').on(table.userId),
  taskIdIdx: index('idx_monitoring_alerts_task').on(table.monitoringTaskId),
  enabledIdx: index('idx_monitoring_alerts_enabled').on(table.enabled),
}));

export const notificationLogs = createTable('notification_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id),
  alertId: uuid('alert_id')
    .references(() => monitoringAlerts.id, { onDelete: 'cascade' }),
  notificationType: varchar('notification_type', { length: 20 }).notNull(), // email, webhook
  recipient: text('recipient').notNull(),
  subject: text('subject'),
  content: text('content'),
  status: varchar('status', { length: 20 }).default('pending'), // pending, sent, failed
  sentAt: timestamp('sent_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_notification_logs_user').on(table.userId),
  statusIdx: index('idx_notification_logs_status').on(table.status),
  createdAtIdx: index('idx_notification_logs_created_at').on(table.createdAt),
}));

// Monitoring Relations
export const monitoringTasksRelations = relations(monitoringTasks, ({ one, many }) => ({
  user: one(users, {
    fields: [monitoringTasks.userId],
    references: [users.id],
  }),
  priceHistory: many(priceHistory),
  alerts: many(monitoringAlerts),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  monitoringTask: one(monitoringTasks, {
    fields: [priceHistory.monitoringTaskId],
    references: [monitoringTasks.id],
  }),
}));

export const monitoringAlertsRelations = relations(monitoringAlerts, ({ one, many }) => ({
  user: one(users, {
    fields: [monitoringAlerts.userId],
    references: [users.id],
  }),
  monitoringTask: one(monitoringTasks, {
    fields: [monitoringAlerts.monitoringTaskId],
    references: [monitoringTasks.id],
  }),
  notificationLogs: many(notificationLogs),
}));

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  user: one(users, {
    fields: [notificationLogs.userId],
    references: [users.id],
  }),
  alert: one(monitoringAlerts, {
    fields: [notificationLogs.alertId],
    references: [monitoringAlerts.id],
  }),
}));

export type Competitor = typeof competitors.$inferSelect;
export type UserProduct = typeof userProducts.$inferSelect;
export type UserCompetitor = typeof userCompetitors.$inferSelect & {
  competitor: Competitor;
};

// Monitoring Types
export type MonitoringTask = typeof monitoringTasks.$inferSelect;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type MonitoringAlert = typeof monitoringAlerts.$inferSelect;
export type NotificationLog = typeof notificationLogs.$inferSelect;
