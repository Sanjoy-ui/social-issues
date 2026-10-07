import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Government Portal Roles
 */
export const govtRoleEnum = pgEnum("govt_role", [
  "district_nodal", // District-level Nodal Officer (Strictly 1 per district)
  "system_admin",   // Platform / State Administration
]);
