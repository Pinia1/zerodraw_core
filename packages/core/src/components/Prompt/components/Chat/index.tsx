import { useAgentChatComponent } from '../../../../contexts/AgentChatContext';
import { useZeroDrawAgentRuntime } from './useZeroDrawAgentRuntime';
import { AssistantThread } from './AssistantThread';

const DefaultChat = () => {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('projectId') ?? '';

  const { runtime, phase, error, isReady, isSuspended, resume, startNewSession } =
    useZeroDrawAgentRuntime({ projectId });

  const busy = phase === 'streaming' || phase === 'initializing';

  return (
    <AssistantThread
      runtime={runtime}
      phase={phase}
      error={error}
      isReady={isReady}
      isSuspended={isSuspended}
      busy={busy}
      onResume={(decision) => void resume(decision)}
      onStartNewSession={() => void startNewSession()}
    />
  );
};

const Chat = () => {
  const AgentChat = useAgentChatComponent();
  if (AgentChat) return <AgentChat />;
  return <DefaultChat />;
};

export default Chat;
