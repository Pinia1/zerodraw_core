import React, { createContext, useContext } from 'react';
import type { AgentFrontendToolsConfig } from '../features/agent/tools';
import { AgentFrontendToolsProvider } from './AgentFrontendToolsContext';

export type AgentChatComponent = React.ComponentType;

const AgentChatContext = createContext<AgentChatComponent | null>(null);

export function AgentChatProvider({
  component,
  frontendTools,
  children,
}: {
  component: AgentChatComponent;
  frontendTools?: AgentFrontendToolsConfig;
  children: React.ReactNode;
}) {
  return (
    <AgentFrontendToolsProvider value={frontendTools ?? null}>
      <AgentChatContext.Provider value={component}>{children}</AgentChatContext.Provider>
    </AgentFrontendToolsProvider>
  );
}

export function useAgentChatComponent(): AgentChatComponent | null {
  return useContext(AgentChatContext);
}
