import { z } from "zod";

/**
 * Validation schema for registering a civic issue
 */
export const CreateIssueSchema = z.object({
  issue_title: z
    .string()
    .trim()
    .min(3, "Issue title must be at least 3 characters long")
    .max(200, "Issue title cannot exceed 200 characters"),
  issue_description: z
    .string()
    .trim()
    .min(10, "Issue description must be at least 10 characters long")
    .max(5000, "Issue description cannot exceed 5000 characters"),
  latitude: z
    .string()
    .trim()
    .optional()
    .nullable(),
  longitude: z
    .string()
    .trim()
    .optional()
    .nullable(),
  address: z
    .string()
    .trim()
    .optional()
    .nullable(),
  annonymous: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => val === true || val === "true" || val === "1"),
  anonymous: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => val === true || val === "true" || val === "1"),
  issue_fk: z
    .string()
    .trim()
    .optional()
    .nullable(),
});

export type CreateIssueDTO = z.infer<typeof CreateIssueSchema>;
