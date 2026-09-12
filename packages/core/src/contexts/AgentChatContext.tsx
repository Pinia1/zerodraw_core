import React, { createContext, useContext } from 'react';

export type AgentChatComponent = React.ComponentType;

const AgentChatContext = createContext<AgentChatComponent | null>(null);

export function AgentChatProvider({
  component,
  children,
}: {
  component: AgentChatComponent;
  children: React.ReactNode;
}) {
  return <AgentChatContext.Provider value={component}>{children}</AgentChatContext.Provider>;
}

export function useAgentChatComponent(): AgentChatComponent | null {
  return useContext(AgentChatContext);
}
