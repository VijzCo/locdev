/**
 * Zod schemas for validating user input.
 *
 * These run on both the client (form validation) and server (Cloud
 * Functions, API routes) — never trust client validation alone.
 */

import { z } from 'zod';
import { MACHINE_TYPES } from '@/types';

// ============================================================================
// AUTH
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z
  .object({
    displayName: z.string().min(2, 'Name is too short').max(80),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
    companyName: z.string().min(2, 'Company name is required').max(120),
    country: z.string().length(2, 'Use ISO 2-letter country code'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================================================
// FACTORY HIERARCHY
// ============================================================================

export const factorySchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/, 'Use uppercase letters, digits, _ or -'),
  address: z.string().max(500).optional(),
  country: z.string().length(2),
  cpm: z.number().min(0).max(10),
  targetEfficiency: z.number().min(0.1).max(1.2),
  workingMinutesPerDay: z.number().int().min(60).max(1440),
  workingDaysPerMonth: z.number().int().min(1).max(31),
});

export type FactoryInput = z.infer<typeof factorySchema>;

export const departmentSchema = z.object({
  factoryId: z.string().min(1),
  name: z.string().min(1).max(120),
  type: z.enum(['cutting', 'sewing', 'finishing', 'washing', 'packing', 'other']),
  cpm: z.number().min(0).max(10).optional(),
});

export const productionLineSchema = z.object({
  factoryId: z.string().min(1),
  departmentId: z.string().min(1),
  name: z.string().min(1).max(120),
  capacity: z.number().int().min(1).max(500),
  supervisorId: z.string().optional(),
});

// ============================================================================
// STYLE
// ============================================================================

export const styleSchema = z.object({
  factoryId: z.string().min(1),
  styleNumber: z.string().min(1).max(50),
  description: z.string().min(1).max(500),
  buyerId: z.string().optional(),
  buyerName: z.string().optional(),
  season: z.string().max(40).optional(),
  category: z.enum([
    'tshirt',
    'polo',
    'shirt',
    'blouse',
    'trouser',
    'jeans',
    'shorts',
    'dress',
    'skirt',
    'jacket',
    'underwear',
    'activewear',
    'other',
  ]),
  orderQty: z.number().int().min(0),
  targetSmv: z.number().min(0).max(500).optional(),
  fobPrice: z.number().min(0).optional(),
  targetCm: z.number().min(0).optional(),
});

export type StyleInput = z.infer<typeof styleSchema>;

// ============================================================================
// OPERATION
// ============================================================================

export const operationSchema = z.object({
  styleId: z.string().min(1),
  sequence: z.number().int().min(1),
  description: z.string().min(1).max(200),
  section: z.enum(['cutting', 'preparation', 'assembly', 'finishing', 'packing']),
  machineType: z.enum(MACHINE_TYPES),
  smv: z.number().min(0).max(60),
  smvMethod: z.enum(['manual', 'stopwatch', 'motion_analysis', 'imported']),
  observations: z.array(z.number().positive()).optional(),
  performanceRating: z.number().min(0.5).max(2).optional(),
  allowancePct: z.number().min(0).max(1).optional(),
  motionBreakdown: z
    .array(
      z.object({
        motionId: z.string(),
        motionCode: z.string(),
        description: z.string(),
        tmu: z.number(),
        frequency: z.number().min(0),
      })
    )
    .optional(),
  isHelper: z.boolean(),
  qualityCheckpoint: z.string().max(200).optional(),
  threadDetails: z.string().max(200).optional(),
  attachmentDetails: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

export type OperationInput = z.infer<typeof operationSchema>;

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    'factory_admin',
    'ie_manager',
    'ie_officer',
    'planning_manager',
    'production_manager',
    'supervisor',
    'viewer',
  ]),
  factoryAccess: z.array(z.string()),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
