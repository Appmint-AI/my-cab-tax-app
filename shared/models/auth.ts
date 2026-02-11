import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  termsVersion: varchar("terms_version"),
  dataDeletionRequestedAt: timestamp("data_deletion_requested_at"),
  accountDeletedAt: timestamp("account_deleted_at"),
  accountDeleteConfirmation: varchar("account_delete_confirmation"),
  scheduledPurgeAt: timestamp("scheduled_purge_at"),
  isDeactivated: boolean("is_deactivated").default(false),
  subscriptionStatus: varchar("subscription_status").default("basic"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  dataRetentionUntil: timestamp("data_retention_until"),
  vaultEnabled: boolean("vault_enabled").default(false),
  lastLoginAt: timestamp("last_login_at"),
  inactivityEmailSent: varchar("inactivity_email_sent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
