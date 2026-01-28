import { z } from 'zod';

/**
 * Centralized validation schemas for security-critical forms
 */

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'E-mail é obrigatório')
    .email('E-mail inválido')
    .max(255, 'E-mail muito longo'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .max(128, 'Senha muito longa'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Strong password validation (for new accounts)
const strongPasswordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(128, 'Máximo 128 caracteres')
  .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Deve conter pelo menos um número');

// Admin setup / organization creation schema
export const adminSetupSchema = z
  .object({
    organizationName: z
      .string()
      .trim()
      .min(2, 'Nome da organização muito curto')
      .max(100, 'Nome da organização muito longo')
      .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_.]+$/, 'Nome contém caracteres inválidos'),
    fullName: z
      .string()
      .trim()
      .min(3, 'Nome muito curto')
      .max(100, 'Nome muito longo'),
    email: z
      .string()
      .trim()
      .min(1, 'E-mail é obrigatório')
      .email('E-mail inválido')
      .max(255, 'E-mail muito longo'),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export type AdminSetupFormData = z.infer<typeof adminSetupSchema>;

// User creation schema (for admin creating users)
export const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'E-mail é obrigatório')
    .email('E-mail inválido')
    .max(255, 'E-mail muito longo'),
  password: z
    .string()
    .min(6, 'Mínimo 6 caracteres')
    .max(128, 'Máximo 128 caracteres'),
  full_name: z
    .string()
    .trim()
    .min(2, 'Nome muito curto')
    .max(100, 'Nome muito longo'),
  role: z.enum(['morador', 'sindico', 'administrador', 'porteiro']),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

// Profile update schema
export const profileUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Nome muito curto')
    .max(100, 'Nome muito longo')
    .optional(),
  avatarUrl: z.string().url('URL inválida').optional().nullable(),
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

// First condominium setup schema
export const firstCondominiumSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome muito curto')
    .max(100, 'Nome muito longo'),
  address: z
    .string()
    .trim()
    .max(255, 'Endereço muito longo')
    .optional()
    .or(z.literal('')),
  total_units: z
    .number()
    .int('Deve ser um número inteiro')
    .min(1, 'Mínimo 1 unidade')
    .max(1000, 'Máximo 1000 unidades'),
});

export type FirstCondominiumFormData = z.infer<typeof firstCondominiumSchema>;
