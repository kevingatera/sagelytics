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

export type Competitor = typeof competitors.$inferSelect;
export type UserProduct = typeof userProducts.$inferSelect;
export type UserCompetitor = typeof userCompetitors.$inferSelect & {
  competitor: Competitor;
};
