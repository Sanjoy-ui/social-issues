import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Industry Entity Types
 */
export const industryTypeEnum = pgEnum("industry_type", [
  "corporate",
  "startup",
  "msme",
  "csr",
  "research_lab",
  "incubator",
  "psu",
]);

/**
 * Types of contribution to social issue solutions
 */
export const industryContributionTypeEnum = pgEnum("industry_contribution_type", [
  "funding",
  "mentorship",
  "prototyping",
  "deployment",
  "testing",
]);
