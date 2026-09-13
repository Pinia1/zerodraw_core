import type { ReactNode } from 'react';

interface StudioLayoutProps {
  title?: string;
  chat: ReactNode;
  flow: ReactNode;
}

export function StudioLayout({ title, chat, flow }: StudioLayoutProps) {
  return (
    <div className="studio-page">
      <header className="studio-header">
        <span className="studio-header-title">{title ?? 'Studio'}</span>
      </header>
      <div className="studio-body">
        <aside className="studio-chat-column">{chat}</aside>
        <main className="studio-flow-column">{flow}</main>
      </div>
    </div>
  );
}
