import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const university = pgTable("university", {
  universityID: varchar("universityID", { length: 255 }).primaryKey(),
  universityName: text("universityName").notNull(),
  universityAddress: text("universityAddress"),
  universityContactNo: text("universityContactNo"),
  universityWebsiteLink: text("universityWebsiteLink"),
  isUniversityActive: boolean("isUniversityActive").default(true),
  isUniversityVerified: boolean("isUniversityVerified").default(false),
  universityResearchDepartments: text("universityResearchDepartments").array(),
  AISHECode: text("AISHECode").unique().notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type University = typeof university.$inferSelect;
export type NewUniversity = typeof university.$inferInsert;
