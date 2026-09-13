import { z } from 'zod';

export const agentSessionEventTypeSchema = z.enum([
  'session_created',
  'prompt_started',
  'prompt_completed',
  'prompt_failed',
  'prompt_suspended',
  'session_suspended',
  'session_resumed',
  'session_closed',
  'harness_opened',
  'harness_idle_closed',
  'worker_assigned',
  'worker_crashed',
]);

export type AgentSessionEventType = z.infer<typeof agentSessionEventTypeSchema>;

export const agentCloseReasonSchema = z.enum(['user_close', 'idle', 'admin', 'error']);
export type AgentCloseReason = z.infer<typeof agentCloseReasonSchema>;

export const agentRuntimeHostSchema = z.enum(['inprocess', 'worker']);
export type AgentRuntimeHostKind = z.infer<typeof agentRuntimeHostSchema>;

export const agentPromptRunStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'suspended',
  'aborted',
]);
export type AgentPromptRunStatus = z.infer<typeof agentPromptRunStatusSchema>;

/** Admin：观测总览 */
export const agentAdminOverviewSchema = z.object({
  sessions: z.object({
    total: z.number(),
    active: z.number(),
    suspended: z.number(),
    closed: z.number(),
  }),
  prompts: z.object({
    totalRuns: z.number(),
    todayRuns: z.number(),
    failedRuns: z.number(),
  }),
  usage: z.object({
    totalTokens: z.number(),
    totalCost: z.number(),
  }),
  runtime: z.object({
    loadedCount: z.number(),
    executingCount: z.number(),
    runtimeHost: agentRuntimeHostSchema,
  }),
});

export type AgentAdminOverview = z.infer<typeof agentAdminOverviewSchema>;

export const agentAdminSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'suspended', 'closed']).optional(),
  userId: z.coerce.number().int().optional(),
  projectId: z.string().optional(),
});

export type AgentAdminSessionsQuery = z.infer<typeof agentAdminSessionsQuerySchema>;

export const agentAdminSessionRowSchema = z.object({
  id: z.string(),
  userId: z.number(),
  projectId: z.string().nullable(),
  title: z.string().nullable(),
  status: z.enum(['active', 'suspended', 'closed']),
  promptCount: z.number(),
  lastPromptAt: z.number().nullable(),
  lastActivityAt: z.number().nullable(),
  createdAt: z.number(),
  closedAt: z.number().nullable(),
  closeReason: agentCloseReasonSchema.nullable(),
  runtimeHost: agentRuntimeHostSchema.nullable(),
  usage: z.unknown(),
});

export type AgentAdminSessionRow = z.infer<typeof agentAdminSessionRowSchema>;

export const agentAdminSessionEventSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  userId: z.number(),
  projectId: z.string().nullable(),
  eventType: agentSessionEventTypeSchema,
  payload: z.unknown().nullable(),
  createdAt: z.number(),
});

export type AgentAdminSessionEvent = z.infer<typeof agentAdminSessionEventSchema>;

export const agentAdminTimelineSchema = z.object({
  session: agentAdminSessionRowSchema,
  events: z.array(agentAdminSessionEventSchema),
  promptRuns: z.array(
    z.object({
      id: z.string(),
      status: agentPromptRunStatusSchema,
      startedAt: z.number(),
      finishedAt: z.number().nullable(),
      durationMs: z.number().nullable(),
      usage: z.unknown().nullable(),
      errorMessage: z.string().nullable(),
      runtimeHost: agentRuntimeHostSchema.nullable(),
      workerSlot: z.number().nullable(),
    }),
  ),
  runtime: z
    .object({
      loaded: z.boolean(),
      executing: z.boolean(),
      workerSlot: z.number().nullable(),
      heartbeatAt: z.number(),
    })
    .nullable(),
});

export type AgentAdminTimeline = z.infer<typeof agentAdminTimelineSchema>;

export const agentAdminUsageQuerySchema = z.object({
  from: z.coerce.number().int().optional(),
  to: z.coerce.number().int().optional(),
  groupBy: z.enum(['user', 'project', 'day']).default('day'),
  userId: z.coerce.number().int().optional(),
  projectId: z.string().optional(),
});

export type AgentAdminUsageQuery = z.infer<typeof agentAdminUsageQuerySchema>;

export const agentAdminUsageRowSchema = z.object({
  key: z.string(),
  userId: z.number().optional(),
  projectId: z.string().nullable().optional(),
  day: z.string().optional(),
  runCount: z.number(),
  failedCount: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
});

export type AgentAdminUsageRow = z.infer<typeof agentAdminUsageRowSchema>;

/** Admin：强制关闭会话 */
export const agentAdminCloseSessionBodySchema = z.object({
  closeReason: agentCloseReasonSchema.default('admin'),
});

export type AgentAdminCloseSessionBody = z.infer<typeof agentAdminCloseSessionBodySchema>;
