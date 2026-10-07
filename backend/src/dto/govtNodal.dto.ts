import { z } from "zod";

/**
 * Validation schema for District Nodal Officer Registration
 */
export const RegisterGovtNodalSchema = z.object({
  firstname: z
    .string()
    .min(2, "First name must be at least 2 characters long"),
  lastname: z
    .string()
    .min(1, "Last name is required"),
  email: z
    .string()
    .email("Invalid official email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long"),
  state: z
    .string()
    .min(2, "State name is required"),
  district: z
    .string()
    .min(2, "District name is required"),
  department: z
    .string()
    .min(2, "Department name is required"),
  designation: z
    .string()
    .min(2, "Designation is required"),
  officeId: z
    .string()
    .optional()
    .default(""),
  contactNo: z
    .string()
    .min(10, "Contact number must be at least 10 digits"),
});

export type RegisterGovtNodalDTO = z.infer<typeof RegisterGovtNodalSchema>;

/**
 * Validation schema for Government Nodal Officer Login
 */
export const LoginGovtNodalSchema = z.object({
  email: z
    .string()
    .email("Invalid official email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginGovtNodalDTO = z.infer<typeof LoginGovtNodalSchema>;
