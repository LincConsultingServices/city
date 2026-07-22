// Wire schemas (Zod) — the single source of truth for backend data shapes.
// TS types are inferred from these; the ApiClient parses every response through
// them so malformed data fails loudly at the boundary (PRD §12.4).
//
// Field names mirror the VERIFIED live backend EXACTLY (academy-backend Go
// source). The 7 result kinds map scoring.Result's seven optional pointers.

import { z } from 'zod';

// ── Badges (live: GET /badges, and badgesAwarded[] on submit) ────────────────
export const BadgeSchema = z
  .object({
    id: z.string(),
    kind: z.string().optional(),
    competencyCode: z.string().optional(),
    level: z.string().optional(),
    tier: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    iconAsset: z.string().optional(),
    criteria: z.any().optional(),
  })
  .passthrough();
export type Badge = z.infer<typeof BadgeSchema>;

// ── Registry bootstrap (live: GET /registry/modules) ─────────────────────────
export const ModuleSchema = z.object({}).passthrough(); // permissive in F0; F1 tightens
export const ModulesResponseSchema = z
  .object({
    modules: z.array(ModuleSchema).default([]),
    registryVersion: z.string().default(''),
  })
  .passthrough();
export type ModulesResponse = z.infer<typeof ModulesResponseSchema>;

// Activity metadata (the RegistryPublic projection — NO renderable content; the
// backend serves only routing/scoring metadata, display content is client-authored).
export const ActivitySummarySchema = z
  .object({
    id: z.string(),
    competencyCode: z.string().optional(),
    level: z.string().optional(),
    subtopic: z.string().optional(),
    orderIndex: z.number().optional(),
    activityType: z.string(),
    title: z.string().default(''),
    estMinutes: z.number().optional(),
    passCriteria: z.any().optional(),
    // present on the level list (per-user), absent on the bare activity endpoint
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).optional(),
    bestProficiency: z.number().nullable().optional(),
  })
  .passthrough();
export type ActivitySummary = z.infer<typeof ActivitySummarySchema>;

export const LevelSchema = z
  .object({
    competency: z.string().optional(),
    level: z.string().optional(),
    activities: z.array(ActivitySummarySchema).default([]),
  })
  .passthrough();
export type LevelResponse = z.infer<typeof LevelSchema>;

export const ActivitySchema = ActivitySummarySchema;

export const ProgressEntrySchema = z
  .object({
    activityId: z.string(),
    competencyCode: z.string().optional(),
    level: z.string().optional(),
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).optional(),
    proficiency: z.number().nullable().optional(),
    bestProficiency: z.number().nullable().optional(),
    attemptsCount: z.number().optional(),
    hintsUsed: z.number().optional(),
  })
  .passthrough();
export type ProgressEntry = z.infer<typeof ProgressEntrySchema>;

export const ProgressListSchema = z
  .object({ progress: z.array(ProgressEntrySchema).default([]) })
  .passthrough();

export const ProfileSchema = z.object({}).passthrough();
export const BadgesResponseSchema = z
  .object({ badges: z.array(BadgeSchema).default([]) })
  .passthrough();

// ── The 7 result kinds (exact backend field names) ───────────────────────────
export const ObjectiveResultSchema = z.object({
  answers: z.array(z.object({ itemId: z.string(), choice: z.string() })),
});
export const OrderResultSchema = z.object({ sequence: z.array(z.string()) });
export const TraceResultSchema = z.object({ path: z.array(z.string()) });
export const MetricsResultSchema = z.object({
  values: z.record(z.string(), z.any()),
  decisionLog: z.array(z.any()).optional(),
});
export const SlotsResultSchema = z.object({ picks: z.record(z.string(), z.array(z.string())) });
export const TextResultSchema = z.object({ content: z.string() });
export const TranscriptResultSchema = z.object({
  turns: z.array(z.object({ role: z.enum(['user', 'ai']), text: z.string() })),
});

/**
 * The submit `result` container — scoring.Result's seven optional pointers,
 * with EXACTLY ONE present. A renderer literally cannot emit a malformed
 * result: this schema rejects zero or multiple kinds.
 */
export const ResultSchema = z
  .object({
    objective: ObjectiveResultSchema.optional(),
    order: OrderResultSchema.optional(),
    trace: TraceResultSchema.optional(),
    metrics: MetricsResultSchema.optional(),
    slots: SlotsResultSchema.optional(),
    text: TextResultSchema.optional(),
    transcript: TranscriptResultSchema.optional(),
  })
  .refine((r) => Object.values(r).filter((v) => v !== undefined).length === 1, {
    message: 'result must contain exactly one kind',
  });
export type Result = z.infer<typeof ResultSchema>;
export type ResultKind =
  'objective' | 'order' | 'trace' | 'metrics' | 'slots' | 'text' | 'transcript';

// ── Submit (live: POST /progress/{id}/submit) ────────────────────────────────
export const SubmitRequestSchema = z.object({
  clientVersion: z.string(),
  durationSec: z.number().int().nonnegative(),
  hintsUsed: z.number().int().nonnegative(),
  result: ResultSchema,
});
export type SubmitRequest = z.infer<typeof SubmitRequestSchema>;

export const SubmitResponseSchema = z
  .object({
    activityId: z.string(),
    proficiency: z.number().int(), // 1..3
    bestProficiency: z.number().int(),
    passed: z.boolean(),
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
    feedback: z.string(),
    graded: z.enum(['server', 'ai', 'fallback']),
    badgesAwarded: z.array(BadgeSchema).default([]),
    // Economy fields do NOT exist yet (backend BE-1). Accept them optionally so
    // the client starts feeding coins the moment the backend adds them — no
    // schema change needed. The Economy seam holds no fake data until then.
    coinsEarned: z.number().int().optional(),
    coinBalance: z.number().int().optional(),
  })
  .passthrough();
export type SubmitResponse = z.infer<typeof SubmitResponseSchema>;
