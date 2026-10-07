import { pgTable, text, varchar, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { govtRoleEnum } from "./govtEnums.js";

export const govtNodal = pgTable(
  "govt_nodal",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    firstname: text("firstname").notNull(),
    lastname: text("lastname").notNull(),
    email: text("email").unique().notNull(),
    passwordHash: text("password_hash").notNull(),
    refreshToken: text("refresh_token"),

    // Role & Administrative Jurisdiction
    role: govtRoleEnum("role").default("district_nodal").notNull(),
    state: text("state").notNull(),
    district: text("district").notNull(),

    // Departmental Information
    department: text("department").notNull(),
    designation: text("designation").notNull(),
    officeId: text("office_id"),
    contactNo: text("contact_no").notNull(),

    // Flags
    isEmailVerified: boolean("is_email_verified").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Database constraint: Strictly 1 Nodal Officer per District
    uniqueDistrictNodal: uniqueIndex("unique_district_nodal_idx").on(table.state, table.district),
  })
);

export type GovtNodal = typeof govtNodal.$inferSelect;
export type NewGovtNodal = typeof govtNodal.$inferInsert;
