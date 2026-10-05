import { pgTable, text, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const govtNodal = pgTable("govt_nodal", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: text("email"),
  contactNo: integer("contactNo"),
  designation: integer("designation"),
  officeId: text("officeId"),
  isEmailVerified: boolean("isEmailVerified"),
  districtNodal: text("districtNodal"),
  nodal_fk: text("nodal_fk"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type GovtNodal = typeof govtNodal.$inferSelect;
export type NewGovtNodal = typeof govtNodal.$inferInsert;
