import { CheckOutlined, CopyOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons';
import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  type AssistantRuntime,
} from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import { Alert, Button, Spin, Typography } from 'antd';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const { Text } = Typography;

const Root = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 320px;
  gap: 8px;
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`;

const ThreadRoot = styled(ThreadPrimitive.Root)`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
`;

const ThreadViewport = styled(ThreadPrimitive.Viewport)`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 2px 8px;
`;

const MessageColumn = styled.div<{ $role: 'user' | 'assistant' | 'system' }>`
  display: flex;
  flex-direction: column;
  align-self: ${({ $role }) => ($role === 'user' ? 'flex-end' : 'flex-start')};
  max-width: 92%;
  gap: 4px;
`;

const MessageRoot = styled.div<{ $role: 'user' | 'assistant' | 'system' }>`
  padding: 8px 12px;
  border-radius: 12px;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.5;
  background: ${({ $role }) => {
    if ($role === 'user') return 'var(--container-active, rgba(22, 119, 255, 0.15))';
    if ($role === 'system') return 'transparent';
    return 'var(--container-hover-bg, rgba(0, 0, 0, 0.04))';
  }};
  color: var(--container-color, inherit);
  border: ${({ $role }) =>
    $role === 'system' ? '1px dashed var(--container-border-color, #d9d9d9)' : 'none'};
  opacity: ${({ $role }) => ($role === 'system' ? 0.85 : 1)};
`;

const MessageMeta = styled(Text)`
  && {
    font-size: 11px;
    opacity: 0.55;
    display: block;
    margin-bottom: 4px;
  }
`;

const MarkdownBody = styled.div`
  p {
    margin: 0 0 0.5em;
  }
  p:last-child {
    margin-bottom: 0;
  }
  pre {
    margin: 0.5em 0;
    padding: 8px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 12px;
    background: var(--container-hover-bg, rgba(0, 0, 0, 0.06));
  }
  code {
    font-size: 12px;
  }
`;

const ActionBarRoot = styled(ActionBarPrimitive.Root)`
  display: flex;
  gap: 2px;
  align-items: center;
  min-height: 24px;
  opacity: 0;
  transition: opacity 0.15s ease;

  ${MessageColumn}:hover &,
  ${MessageColumn}:focus-within &,
  &[data-floating] {
    opacity: 1;
  }
`;

const ActionBarButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--container-color, inherit);
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
  opacity: 0.72;

  &:hover:not(:disabled) {
    opacity: 1;
    background: var(--container-hover-bg, rgba(0, 0, 0, 0.06));
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  &[data-copied='true'] {
    opacity: 1;
    color: var(--ant-color-success, #52c41a);
  }

  .copy-default {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .copy-done {
    display: none;
    align-items: center;
    gap: 4px;
  }

  &[data-copied='true'] .copy-default {
    display: none;
  }

  &[data-copied='true'] .copy-done {
    display: inline-flex;
  }
`;

const ComposerRoot = styled(ComposerPrimitive.Root)`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--container-border-color, rgba(0, 0, 0, 0.06));
`;

const ComposerRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
`;

const ComposerInput = styled(ComposerPrimitive.Input)`
  flex: 1;
  min-height: 56px;
  max-height: 120px;
  resize: none;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--container-border-color, #d9d9d9);
  background: var(--container-bg, #fff);
  color: var(--container-color, inherit);
  font-size: 13px;
  line-height: 1.5;
  font-family: inherit;
  &:focus {
    outline: none;
    border-color: var(--ant-color-primary, #1677ff);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SendButton = styled(ComposerPrimitive.Send)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: var(--ant-color-primary, #1677ff);
  color: #fff;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ToolCallBox = styled.div`
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--container-hover-bg, rgba(0, 0, 0, 0.04));
  white-space: pre-wrap;
`;

function MarkdownText() {
  return (
    <MarkdownBody>
      <MarkdownTextPrimitive />
    </MarkdownBody>
  );
}

function ToolCallPart({ toolName, result }: { toolName: string; result?: unknown }) {
  const { t } = useTranslation();
  const text = typeof result === 'string' ? result : result ? JSON.stringify(result, null, 2) : '';
  return (
    <ToolCallBox>
      <MessageMeta type="secondary">{toolName || t('prompt.chatTool')}</MessageMeta>
      {text}
    </ToolCallBox>
  );
}

function MessageActionBar() {
  const { t } = useTranslation();

  return (
    <ActionBarRoot hideWhenRunning autohide="always" autohideFloat="single-branch">
      <ActionBarButton>
        <ActionBarPrimitive.Copy copiedDuration={2000}>
          <span className="copy-default">
            <CopyOutlined />
            {t('prompt.chatCopy')}
          </span>
          <span className="copy-done">
            <CheckOutlined />
            {t('prompt.chatCopied')}
          </span>
        </ActionBarPrimitive.Copy>
      </ActionBarButton>
      <MessagePrimitive.If assistant>
        <ActionBarButton>
          <ActionBarPrimitive.Reload>
            <ReloadOutlined />
            {t('prompt.chatRegenerate')}
          </ActionBarPrimitive.Reload>
        </ActionBarButton>
      </MessagePrimitive.If>
    </ActionBarRoot>
  );
}

function MessageShell(props: ComponentPropsWithoutRef<'div'>) {
  const { t } = useTranslation();
  const role = useAuiState((s) => s.message.role);

  return (
    <MessageRoot $role={role} {...props}>
      <MessagePrimitive.If assistant>
        <MessageMeta type="secondary">{t('prompt.chatAssistant')}</MessageMeta>
      </MessagePrimitive.If>
      <MessagePrimitive.If system>
        <MessageMeta type="secondary">{t('prompt.chatSummary')}</MessageMeta>
      </MessagePrimitive.If>
      <MessagePrimitive.Parts
        components={{
          Text: MarkdownText,
          tools: {
            Fallback: ({ toolName, result }) => (
              <ToolCallPart toolName={toolName} result={result} />
            ),
          },
        }}
      />
    </MessageRoot>
  );
}

function ThreadMessageItem() {
  const role = useAuiState((s) => s.message.role);

  return (
    <MessageColumn $role={role}>
      <MessagePrimitive.Root>
        <MessageShell />
        <MessageActionBar />
      </MessagePrimitive.Root>
    </MessageColumn>
  );
}

export interface AssistantThreadProps {
  runtime: AssistantRuntime;
  phase: 'idle' | 'initializing' | 'streaming' | 'suspended';
  error: string | null;
  isReady: boolean;
  isSuspended: boolean;
  busy: boolean;
  onResume: (decision: 'approve' | 'reject') => void;
  onStartNewSession: () => void;
}

export function AssistantThread({
  runtime,
  phase,
  error,
  isReady,
  isSuspended,
  busy,
  onResume,
  onStartNewSession,
}: AssistantThreadProps) {
  const { t } = useTranslation();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Root>
        <Toolbar>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {phase === 'initializing'
              ? t('prompt.chatConnecting')
              : isSuspended
                ? t('prompt.chatSuspended')
                : phase === 'streaming'
                  ? t('prompt.chatStreaming')
                  : t('prompt.chatReady')}
          </Text>
          <Button size="small" type="link" disabled={busy} onClick={onStartNewSession}>
            {t('prompt.chatNewSession')}
          </Button>
        </Toolbar>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        <ThreadRoot>
          <ThreadViewport>
            {!isReady ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <Spin />
              </div>
            ) : (
              <>
                <ThreadPrimitive.Empty>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {t('prompt.chatEmpty')}
                  </Text>
                </ThreadPrimitive.Empty>
                <ThreadPrimitive.Messages components={{ Message: ThreadMessageItem }} />
              </>
            )}
          </ThreadViewport>

          {isSuspended ? (
            <ComposerRow>
              <Button block onClick={() => onResume('reject')} disabled={busy}>
                {t('prompt.chatReject')}
              </Button>
              <Button block type="primary" onClick={() => onResume('approve')} disabled={busy}>
                {t('prompt.chatApprove')}
              </Button>
            </ComposerRow>
          ) : null}

          <ComposerRoot>
            <ComposerRow>
              <ComposerInput
                rows={2}
                placeholder={t('prompt.chatPlaceholder')}
                disabled={!isReady || busy || isSuspended}
              />
              <SendButton disabled={!isReady || busy || isSuspended}>
                <SendOutlined />
              </SendButton>
            </ComposerRow>
          </ComposerRoot>
        </ThreadRoot>
      </Root>
    </AssistantRuntimeProvider>
  );
}
