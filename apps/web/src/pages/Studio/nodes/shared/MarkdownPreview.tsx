import React from 'react';
import styled from 'styled-components';

const PreviewRoot = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.55;
  color: #e8e8e8;
  cursor: text;

  h1,
  h2,
  h3 {
    margin: 0.6em 0 0.35em;
    font-weight: 600;
  }

  h1 {
    font-size: 1.15em;
  }

  h2 {
    font-size: 1.05em;
  }

  h3 {
    font-size: 1em;
  }

  p {
    margin: 0.35em 0;
  }

  ul {
    padding-left: 1.25em;
    margin: 0.35em 0;
  }

  li {
    margin: 0.2em 0;
  }

  strong {
    color: #fff;
    font-weight: 600;
  }
`;

interface MarkdownPreviewProps {
  content: string;
  onClick?: () => void;
}

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderMarkdown(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(<ul key={`ul-${nodes.length}`}>{listItems}</ul>);
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      nodes.push(<h3 key={index}>{renderInline(trimmed.slice(4))}</h3>);
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      nodes.push(<h2 key={index}>{renderInline(trimmed.slice(3))}</h2>);
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushList();
      nodes.push(<h1 key={index}>{renderInline(trimmed.slice(2))}</h1>);
      return;
    }

    if (trimmed.startsWith('- ')) {
      listItems.push(<li key={index}>{renderInline(trimmed.slice(2))}</li>);
      return;
    }

    flushList();
    nodes.push(<p key={index}>{renderInline(trimmed)}</p>);
  });

  flushList();
  return nodes;
}

export function MarkdownPreview({ content, onClick }: MarkdownPreviewProps) {
  const text = content.trim() || '点击编辑分镜脚本…';

  return (
    <PreviewRoot onClick={onClick} className="nodrag nowheel">
      {renderMarkdown(text)}
    </PreviewRoot>
  );
}
