import { z } from "zod";

/**
 * Schema for Industry Partner & SPOC Registration
 */
export const RegisterIndustrySchema = z.object({
  name: z
    .string()
    .min(2, "Industry / Company name must be at least 2 characters long"),
  type: z.enum([
    "corporate",
    "startup",
    "msme",
    "csr",
    "research_lab",
    "incubator",
    "psu",
  ]),
  sectorTags: z
    .array(z.string())
    .min(1, "Please provide at least one relevant sector tag"),
  contributionTypes: z
    .array(
      z.enum([
        "funding",
        "mentorship",
        "prototyping",
        "deployment",
        "testing",
      ])
    )
    .min(1, "Please select at least one contribution type"),
  operatingDistricts: z.array(z.string()).optional().default([]),
  location: z.string().optional().default(""),
  contactDetails: z
    .object({
      website: z.string().url("Invalid website URL").optional().or(z.literal("")),
      phone: z.string().optional().default(""),
      officialEmail: z.string().email("Invalid official email").optional().or(z.literal("")),
      registrationNumber: z.string().optional().default(""),
    })
    .optional(),
  spoc: z.object({
    firstname: z.string().min(2, "First name must be at least 2 characters long"),
    lastname: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid corporate email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
    designation: z.string().optional().default("SPOC"),
    phone: z.string().optional().default(""),
  }),
});

export type RegisterIndustryDTO = z.infer<typeof RegisterIndustrySchema>;

/**
 * Schema for Industry SPOC Login
 */
export const LoginIndustrySchema = z.object({
  email: z.string().email("Invalid corporate email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginIndustryDTO = z.infer<typeof LoginIndustrySchema>;
