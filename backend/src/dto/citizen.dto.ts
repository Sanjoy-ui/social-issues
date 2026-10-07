import { z } from "zod";

/**
 * Validation schema for Citizen Registration
 */
export const RegisterCitizenSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters long")
    .max(100, "Full name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^[0-9+\s-]{10,15}$/.test(val), {
      message: "Phone number must be between 10 and 15 digits",
    }),
  state: z
    .string()
    .trim()
    .optional(),
  district: z
    .string()
    .trim()
    .optional(),
  pincode: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^[0-9]{6}$/.test(val), {
      message: "Pincode must be a valid 6-digit postal code",
    }),
});

export type RegisterCitizenDTO = z.infer<typeof RegisterCitizenSchema>;

/**
 * Validation schema for Citizen Login
 */
export const LoginCitizenSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginCitizenDTO = z.infer<typeof LoginCitizenSchema>;
