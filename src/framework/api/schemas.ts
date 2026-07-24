// Zod schemas for the backend wire contract (PRD §8.2, §11). Every response is
// parsed through one of these, so a shape drift is a runtime error at the boundary
// (and, via z.infer, a compile error in callers). Types are inferred from schemas
// — schemas are the single source of truth.
import { z } from "zod";

// ── Result kinds (submit payload — exactly ONE, discriminated by its key) ──────

export const ObjectiveResult = z.object({
  answers: z.array(z.object({ itemId: z.string(), choice: z.string() })),
});
export const OrderResult = z.object({ sequence: z.array(z.string()) });
export const TraceResult = z.object({ path: z.array(z.string()) });
export const MetricsResult = z.object({
  values: z.record(z.unknown()),
  decisionLog: z.array(z.unknown()).optional(),
});
export const SlotsResult = z.object({ picks: z.record(z.array(z.string())) });
export const TextResult = z.object({ content: z.string() });
export const TranscriptResult = z.object({
  turns: z.array(z.object({ role: z.enum(["user", "ai"]), text: z.string() })),
});

// The submit "result" is an object carrying exactly one kind.
export const ResultPayload = z.union([
  z.object({ objective: ObjectiveResult }),
  z.object({ order: OrderResult }),
  z.object({ trace: TraceResult }),
  z.object({ metrics: MetricsResult }),
  z.object({ slots: SlotsResult }),
  z.object({ text: TextResult }),
  z.object({ transcript: TranscriptResult }),
]);
export type ResultPayload = z.infer<typeof ResultPayload>;
export type ResultKind =
  "objective" | "order" | "trace" | "metrics" | "slots" | "text" | "transcript";

export const SubmitRequest = z.object({
  clientVersion: z.string(),
  durationSec: z.number().int().nonnegative(),
  hintsUsed: z.number().int().nonnegative(),
  result: ResultPayload,
});
export type SubmitRequest = z.infer<typeof SubmitRequest>;

// ── Badges / modules / activities ─────────────────────────────────────────────

export const Badge = z.object({
  id: z.string(),
  kind: z.string().optional(),
  competencyCode: z.string().optional(),
  level: z.string().optional(),
  tier: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  iconAsset: z.string().optional(),
});
export type Badge = z.infer<typeof Badge>;

export const ModuleLevel = z.object({
  ageBand: z.string().optional(),
  total: z.number().int(),
  completed: z.number().int(),
});
export const Module = z.object({
  code: z.string(),
  name: z.string(),
  kidName: z.string().optional(),
  subtopics: z.array(z.string()).optional().default([]),
  levels: z.record(ModuleLevel),
  badgesEarned: z.array(Badge).optional().default([]),
});
export type Module = z.infer<typeof Module>;

export const RegistryModules = z.object({
  registryVersion: z.string(),
  modules: z.array(Module),
  metaBadges: z.array(Badge).optional().default([]),
});
export type RegistryModules = z.infer<typeof RegistryModules>;

// passCriteria is server-defined and opaque to the client.
export const ActivityPublic = z.object({
  id: z.string(),
  competencyCode: z.string(),
  level: z.string(),
  subtopic: z.string().optional(),
  orderIndex: z.number().int().optional(),
  activityType: z.string(),
  title: z.string(),
  estMinutes: z.number().int().optional(),
  passCriteria: z.unknown().optional(),
});
export type ActivityPublic = z.infer<typeof ActivityPublic>;

// GET /registry/{comp}/{level} — activity list with per-activity status.
export const LevelActivity = ActivityPublic.extend({
  status: z.string().default("NOT_STARTED"),
  bestProficiency: z.number().int().nullable().optional(),
});
export type LevelActivity = z.infer<typeof LevelActivity>;

export const LevelResponse = z.object({
  competency: z.string(),
  level: z.string(),
  activities: z.array(LevelActivity),
});
export type LevelResponse = z.infer<typeof LevelResponse>;

// ── Submit response ───────────────────────────────────────────────────────────

export const SubmitResponse = z.object({
  activityId: z.string().optional(),
  proficiency: z.number().int(),
  bestProficiency: z.number().int(),
  passed: z.boolean(),
  status: z.string(),
  feedback: z.string().optional().default(""),
  graded: z.enum(["server", "ai", "fallback"]).optional(),
  badgesAwarded: z.array(Badge).optional().default([]),
  // Economy fields — additive backend work (PRD §11.3 / §21 BE-1); optional today.
  coinsEarned: z.number().int().optional(),
  coinBalance: z.number().int().optional(),
});
export type SubmitResponse = z.infer<typeof SubmitResponse>;

// ── Trophy Hall (PRD §9.4) — both endpoints are LIVE on the backend ───────────

// GET /api/v1/badges → { badges: [ ...Badge, awardedAt ] }
export const EarnedBadge = Badge.extend({ awardedAt: z.string().optional().default("") });
export type EarnedBadge = z.infer<typeof EarnedBadge>;

export const BadgesResponse = z.object({ badges: z.array(EarnedBadge) });
export type BadgesResponse = z.infer<typeof BadgesResponse>;

// GET /api/v1/profile → { competencies: [...] }. category is "" when no data yet.
export const CompetencyProfile = z.object({
  code: z.string(),
  name: z.string(),
  completed: z.number().int(),
  totalSeeded: z.number().int(),
  avgProficiency: z.number(),
  category: z.string().optional().default(""),
});
export type CompetencyProfile = z.infer<typeof CompetencyProfile>;

export const ProfileResponse = z.object({ competencies: z.array(CompetencyProfile) });
export type ProfileResponse = z.infer<typeof ProfileResponse>;
