import type { ToolCallMessagePartComponent } from '@assistant-ui/react';

const MODE_LABEL: Record<string, string> = {
  pen: '钢笔',
  brush: '毛刷',
  fill: '填充',
};

export const SwitchDrawToolUI: ToolCallMessagePartComponent = ({ toolName, args, result }) => {
  const mode = (args as { mode?: string } | undefined)?.mode;
  const parsed =
    typeof result === 'string'
      ? (() => {
          try {
            return JSON.parse(result) as { currentMode?: string };
          } catch {
            return null;
          }
        })()
      : (result as { currentMode?: string } | null);

  const current = parsed?.currentMode ?? mode;

  return (
    <div className="text-muted-foreground text-xs">
      <div className="font-medium">{toolName}</div>
      <div className="mt-1">
        已切换为：<span className="text-foreground">{MODE_LABEL[current ?? ''] ?? current ?? '—'}</span>
      </div>
    </div>
  );
};
