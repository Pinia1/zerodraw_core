import { useAuiState } from '@assistant-ui/react';
import { Fetch, PromptEditor, type AgentChatImage, type PromptEditorRef } from '@zeroDraw/core';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

type SidebarComposerProps = {
  autoFocus: boolean;
  disabled?: boolean;
  onSend: (input: { text: string; images?: AgentChatImage[] }) => Promise<void>;
};

export function SidebarComposer({ autoFocus, disabled, onSend }: SidebarComposerProps) {
  const { t } = useTranslation();
  const editorRef = useRef<PromptEditorRef>(null);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const blocked = isRunning || disabled;

  return (
    <div className="aui-composer-root relative w-full rounded-xl bg-background px-1 pb-1.5 pt-1">
      <PromptEditor
        ref={editorRef}
        autoFocus={autoFocus}
        placeholder={t('prompt.chatPlaceholder')}
        loading={blocked}
        onSubmit={(value) => {
          if (blocked) return;
          const images = value.mentions
            .filter((item) => item.s3Key)
            .slice(0, 4)
            .map((item) => ({
              s3Key: item.s3Key as string,
              previewUrl: Fetch.getFileUrl('file', item.s3Key as string),
            }));
          if (!value.text && images.length === 0) return;
          editorRef.current?.clear();
          void onSend({ text: value.text, images });
        }}
      />
    </div>
  );
}
