import React, { createContext, useContext } from 'react';
import type { AgentFrontendToolsConfig } from '../features/agent/tools';

const AgentFrontendToolsContext = createContext<AgentFrontendToolsConfig | null>(null);

export function AgentFrontendToolsProvider({
  value,
  children,
}: {
  value: AgentFrontendToolsConfig | null;
  children: React.ReactNode;
}) {
  return (
    <AgentFrontendToolsContext.Provider value={value}>{children}</AgentFrontendToolsContext.Provider>
  );
}

export function useAgentFrontendToolsConfig(): AgentFrontendToolsConfig | null {
  return useContext(AgentFrontendToolsContext);
}
