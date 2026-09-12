import type { ToolCallMessagePartComponent } from '@assistant-ui/react';

/** get_canvas_state 专用 tool UI（骨架：后续可展示图层列表预览） */
export const GetCanvasStateToolUI: ToolCallMessagePartComponent = ({ toolName, result }) => {
  const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  return (
    <div className="text-muted-foreground text-xs">
      <div className="font-medium">{toolName}</div>
      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap">{text}</pre>
    </div>
  );
};
