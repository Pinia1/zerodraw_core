import { Thread } from '@/components/thread.aui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAgentChatRuntime, useAgentFrontendToolsConfig } from '@zeroDraw/core';
import { useMediaQuery } from '@zeroDraw/common';
import { Alert, Button as AntButton } from 'antd';
import { MessageSquarePlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { SidebarAssistantMessage } from './SidebarAssistantMessage';
import { SidebarComposer } from './SidebarComposer';
import './agent-chat.css';

function AgentChatWelcome() {
  const { t } = useTranslation();

  return (
    <div className="aui-thread-welcome-root mb-4 flex flex-col items-center px-2 text-center">
      <p className="aui-thread-welcome-message-inner text-muted-foreground fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-sm leading-relaxed duration-200">
        {t('prompt.chatEmpty')}
      </p>
    </div>
  );
}

const AgentChatPanel = () => {
  const { t } = useTranslation();
  const [windowTheme] = useMediaQuery();
  const projectId = new URLSearchParams(window.location.search).get('projectId') ?? '';

  const frontendTools = useAgentFrontendToolsConfig();

  const { runtime, phase, error, isSuspended, resume, startNewSession, sessionId, sendPrompt } =
    useAgentChatRuntime({
      projectId,
      frontendTools: frontendTools ?? undefined,
    });

  const busy = phase === 'streaming' || phase === 'initializing';

  const statusText = useMemo(() => {
    if (phase === 'initializing') return t('prompt.chatConnecting');
    if (isSuspended) return t('prompt.chatSuspended');
    if (phase === 'streaming') return t('prompt.chatStreaming');
    return t('prompt.chatReady');
  }, [isSuspended, phase, t]);

  const threadComponents = useMemo(
    () => ({
      Welcome: AgentChatWelcome,
      Composer: (props: { autoFocus: boolean }) => (
        <SidebarComposer {...props} disabled={isSuspended} onSend={sendPrompt} />
      ),
      AssistantMessage: SidebarAssistantMessage,
    }),
    [isSuspended, sendPrompt],
  );

  return (
    <div
      className={cn(
        'agent-chat-panel flex h-full min-h-[320px] flex-col gap-1.5 text-foreground',
        windowTheme === 'dark' && 'dark',
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/40 pb-1.5">
        <span className="text-muted-foreground truncate text-xs">{statusText}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          className="text-muted-foreground hover:text-foreground h-7 shrink-0 gap-1 px-2 text-xs"
          onClick={() => void startNewSession()}
        >
          <MessageSquarePlusIcon className="size-3.5" />
          {t('prompt.chatNewSession')}
        </Button>
      </div>

      {error ? (
        <Alert type="error" showIcon message={error} className="shrink-0 py-2 text-xs" />
      ) : null}

      {isSuspended ? (
        <div className="flex shrink-0 gap-1.5">
          <AntButton block size="small" disabled={busy} onClick={() => void resume('reject')}>
            {t('prompt.chatReject')}
          </AntButton>
          <AntButton block size="small" type="primary" disabled={busy} onClick={() => void resume('approve')}>
            {t('prompt.chatApprove')}
          </AntButton>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <AssistantRuntimeProvider key={sessionId ?? 'pending'} runtime={runtime}>
          <Thread
            components={threadComponents}
            autoFocus={!isSuspended && phase !== 'initializing'}
          />
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
};

export default AgentChatPanel;
