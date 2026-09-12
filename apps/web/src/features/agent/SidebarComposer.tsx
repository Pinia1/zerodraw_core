import { ComposerAddAttachment, ComposerAttachments } from '@/components/attachment.aui';
import { TooltipIconButton } from '@/components/tooltip-icon-button';
import { Button } from '@/components/ui/button';
import { AuiIf, ComposerPrimitive } from '@assistant-ui/react';
import { ArrowUpIcon, SquareIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type SidebarComposerProps = {
  autoFocus: boolean;
};

export function SidebarComposer({ autoFocus }: SidebarComposerProps) {
  const { i18n } = useTranslation();
  const placeholder = i18n.language === 'zh' ? '输入消息…' : 'Send a message…';

  return (
    <ComposerPrimitive.Root className="aui-composer-root relative w-full px-1 pb-1.5 pt-1">
      <ComposerPrimitive.AttachmentDropzone
        render={
          <div
            data-slot="aui_composer-shell"
            className="border-border/40 bg-muted/40 focus-within:border-border/70 focus-within:bg-muted/55 flex w-full cursor-text flex-col gap-1.5 rounded-2xl border transition-[border-color,background-color] data-[dragging=true]:border-dashed data-[dragging=true]:border-ring dark:border-white/10 dark:bg-white/[0.06] dark:focus-within:border-white/20 dark:focus-within:bg-white/[0.09]"
          />
        }
      >
        <ComposerAttachments />
        <div className="flex flex-col gap-1.5">
          <ComposerPrimitive.Input
            placeholder={placeholder}
            className="aui-composer-input caret-primary placeholder:text-muted-foreground/55 w-full resize-none overflow-y-auto bg-transparent px-1 py-0.5 text-sm leading-6 outline-none"
            minRows={3}
            maxRows={8}
            autoFocus={autoFocus}
            enterKeyHint="send"
            aria-label="Message input"
          />
          <div className="flex shrink-0 items-center justify-between">
            <ComposerAddAttachment />
            <AuiIf condition={(s) => !s.thread.isRunning}>
              <ComposerPrimitive.Send
                render={
                  <TooltipIconButton
                    tooltip={i18n.language === 'zh' ? '发送' : 'Send message'}
                    side="top"
                    type="button"
                    variant="default"
                    size="icon"
                    className="aui-composer-send size-8 shrink-0 rounded-full shadow-none"
                    aria-label="Send message"
                  />
                }
              >
                <ArrowUpIcon className="size-4" />
              </ComposerPrimitive.Send>
            </AuiIf>
            <AuiIf condition={(s) => s.thread.isRunning}>
              <ComposerPrimitive.Cancel
                render={
                  <Button
                    type="button"
                    variant="default"
                    size="icon"
                    className="aui-composer-cancel size-8 shrink-0 rounded-full shadow-none"
                    aria-label="Stop generating"
                  />
                }
              >
                <SquareIcon className="size-3.5 fill-current" />
              </ComposerPrimitive.Cancel>
            </AuiIf>
          </div>
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
}
