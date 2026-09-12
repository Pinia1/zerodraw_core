import { AssistantMessage } from '@/components/thread.aui';
import { MessagePrimitive, useAuiState } from '@assistant-ui/react';
import { useTranslation } from 'react-i18next';

function messagePlainText(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .filter((part): part is { type: 'text'; text: string } => part?.type === 'text')
    .map((part) => part.text)
    .join('')
    .trim();
}

export function SidebarAssistantMessage() {
  const { t } = useTranslation();
  const isRunning = useAuiState((s) => s.message.status?.type === 'running');
  const text = useAuiState((s) => messagePlainText(s.message.content));

  if (isRunning && !text) {
    return (
      <MessagePrimitive.Root
        data-slot="aui_assistant-message-root"
        data-role="assistant"
        className="fade-in slide-in-from-bottom-1 animate-in relative duration-150"
      >
        <div
          data-slot="aui_assistant-message-content"
          className="text-muted-foreground flex items-center gap-2 px-2 py-1 text-sm leading-relaxed"
        >
          <span className="animate-pulse" aria-hidden>
            ●
          </span>
          <span>{t('prompt.chatThinking')}</span>
        </div>
      </MessagePrimitive.Root>
    );
  }

  return <AssistantMessage />;
}
