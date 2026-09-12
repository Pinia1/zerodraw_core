import type { AgentLane, Context } from '@earendil-works/pi-agent-core';

/**
 * 释放 lane 上残留的运行中 operation。
 * 常见于 SSE 中断 / 进程重启后从 storage 恢复了 currentOperationId，但没有 activeDrive，
 * 此时 waitForIdle 会永远等 stateChange。
 */
export async function releaseLaneIfBusy(lane: AgentLane, context: Context): Promise<void> {
  const info = await lane.inspectExecution(context);
  if (!info.current) return;

  const aborted = await lane.abort(context);
  if (!aborted.ok) return;

  await Promise.race([
    lane.waitForIdle(context),
    new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
  ]);
}
