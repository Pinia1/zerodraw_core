import {
  AgentHarness,
  StorageBackedSession,
  type AgentHarnessTool,
  type AgentLane,
  type Context,
  type SessionMetadata,
} from '@earendil-works/pi-agent-core';
import { AGENT_MAIN_LANE } from './types/session';
import { toolingOptionsFromSessionMeta } from './tooling-options';
import type { AgentToolingCatalog, HarnessSessionBindings } from './types/tooling';
import { releaseLaneIfBusy } from './lane-ops';

export interface AgentHarnessBundle<
  TMeta extends SessionMetadata,
  TToolContext extends object | undefined,
> {
  session: StorageBackedSession<TMeta>;
  harness: AgentHarness<TToolContext>;
  lane: AgentLane;
  toolsFingerprint: string;
}

export async function openHarnessSession<
  TMeta extends SessionMetadata,
  TToolContext extends object | undefined,
>(
  meta: TMeta,
  context: Context,
  tooling: AgentToolingCatalog,
  bindings: HarnessSessionBindings<TMeta, TToolContext>,
): Promise<AgentHarnessBundle<TMeta, TToolContext>> {
  const model = tooling.getModel();
  const models = tooling.getModels();
  const toolingOptions = toolingOptionsFromSessionMeta(meta);
  const { tools: registeredTools, toolsFingerprint, systemPrompt } = tooling.getTooling(toolingOptions);
  const tools = bindings.wrapTools ? bindings.wrapTools(registeredTools) : registeredTools;

  const session = new StorageBackedSession<TMeta>(meta, bindings.createStorage(meta));
  const { harness } = await AgentHarness.create<TToolContext>(
    {
      session,
      models,
      model,
      tools: tools as AgentHarnessTool<TToolContext, any, any>[],
      toolContext: bindings.createToolContext(meta),
      systemPrompt,
    },
    context,
  );

  const lane = await harness.lane(AGENT_MAIN_LANE, context);
  await releaseLaneIfBusy(lane, context).catch(() => undefined);

  return { session, harness, lane, toolsFingerprint };
}

export async function closeHarnessSession<
  TMeta extends SessionMetadata,
  TToolContext extends object | undefined,
>(
  bundle: Pick<AgentHarnessBundle<TMeta, TToolContext>, 'session' | 'harness'>,
  context: Context,
): Promise<void> {
  await bundle.harness.close(context);
  await bundle.session.close(context);
}
