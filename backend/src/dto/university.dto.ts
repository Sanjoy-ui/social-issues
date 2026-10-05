import { z } from "zod";

/**
 * Schema for University & SPOC Onboarding
 */
export const OnboardUniversitySchema = z.object({
  universityName: z
    .string()
    .min(3, "University name must be at least 3 characters long"),
  AISHECode: z
    .string()
    .min(3, "AISHE Code is required")
    .toUpperCase(),
  universityAddress: z.string().optional().default(""),
  universityContactNo: z.string().optional().default(""),
  universityWebsiteLink: z
    .string()
    .url("Invalid website URL")
    .optional()
    .or(z.literal("")),
  universityResearchDepartments: z
    .array(z.string())
    .optional()
    .default([]),
  spoc: z.object({
    firstname: z.string().min(2, "Firstname must be at least 2 characters long"),
    lastname: z.string().min(1, "Lastname is required"),
    universityEmail: z.string().email("Invalid institutional email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
    positionTitle: z.string().optional().default("SPOC"),
    departmentSpoc: z.string().optional().default("General"),
  }),
});

export type OnboardUniversityDTO = z.infer<typeof OnboardUniversitySchema>;

/**
 * Schema for University Login
 */
export const LoginUniversitySchema = z.object({
  universityEmail: z.string().email("Invalid institutional email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginUniversityDTO = z.infer<typeof LoginUniversitySchema>;
