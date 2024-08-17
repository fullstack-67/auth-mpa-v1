import {
  text,
  integer,
  sqliteTable,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { relations } from "drizzle-orm";

export const usersTable = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name"),
  email: text("email").unique().notNull(),
  password: text("password"), // I remove not null options.
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$default(
    () => new Date()
  ),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  accounts: many(accountsTable),
}));

export const accountsTable = sqliteTable(
  "accounts",
  {
    id: text("id")
      .$defaultFn(() => nanoid())
      .notNull()
      .unique(),
    userId: text("user_id").notNull(),
    provider: text("provider", { enum: ["GITHUB", "DISCORD"] }).notNull(),
    providerAccountId: text("provider_account").notNull(),
    profile: text("profile", { mode: "json" }),
  },
  // I add composite key so that each user can have only one provider type.
  (table) => {
    return {
      id: primaryKey({ columns: [table.userId, table.provider] }),
    };
  }
);

export const accountsRelations = relations(accountsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [accountsTable.userId],
    references: [usersTable.id],
  }),
}));

export const sessionsTable = sqliteTable("sessions", {
  sid: text("sid").primaryKey(),
  expired: integer("expired"),
  sess: text("sess"),
});
