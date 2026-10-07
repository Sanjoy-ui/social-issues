import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const citizens = pgTable("citizens", {
  id: varchar("id", { length: 255 }).primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  state: text("state"),
  district: text("district"),
  pincode: text("pincode"),
  refreshToken: text("refresh_token"),
  isEmailVerified: boolean("is_email_verified").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Citizen = typeof citizens.$inferSelect;
export type NewCitizen = typeof citizens.$inferInsert;
