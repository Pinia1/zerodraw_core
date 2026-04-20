import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import styled from 'styled-components';
import { getR2ThumbnailUrl } from '../../../../../utils';

export interface MentionItem {
  id: string;
  label: string;
  url: string;
  s3Key: string;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: { id: string; label: string }) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        const item = items[selectedIndex];
        if (item) command({ id: item.id, label: item.label });
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return (
      <ListWrapper>
        <EmptyText>No results</EmptyText>
      </ListWrapper>
    );
  }

  return (
    <ListWrapper>
      {items.map((item, index) => (
        <ListItem
          key={item.id}
          $active={index === selectedIndex}
          onClick={() => command({ id: item.id, label: item.label })}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <Thumbnail>
            {item.s3Key ? (
              <img src={getR2ThumbnailUrl(item.s3Key)} alt={item.label} />
            ) : (
              <PlaceholderThumb>{item.label.charAt(0).toUpperCase()}</PlaceholderThumb>
            )}
          </Thumbnail>
          <Label>{item.label}</Label>
        </ListItem>
      ))}
    </ListWrapper>
  );
});

MentionList.displayName = 'MentionList';

export default MentionList;

/* ==================== Styles ==================== */

const ListWrapper = styled.div`
  background: var(--container-bg, #2a2a2c);
  border: 1px solid var(--border-color, rgba(60, 60, 62, 1));
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 4px;
  max-height: 240px;
  overflow-y: auto;
  min-width: 200px;
`;

const ListItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  background: ${({ $active }) =>
    $active ? 'var(--container-hover-bg, rgba(60, 60, 62, 1))' : 'transparent'};
  transition: background 0.15s;

  &:hover {
    background: var(--container-hover-bg, rgba(60, 60, 62, 1));
  }
`;

const Thumbnail = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const PlaceholderThumb = styled.div`
  width: 100%;
  height: 100%;
  background: var(--color-fill-tertiary, rgba(60, 60, 62, 1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--container-color, #999);
`;

const Label = styled.span`
  font-size: 13px;
  color: var(--container-color, #e0e0e0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EmptyText = styled.div`
  padding: 8px 12px;
  font-size: 13px;
  color: #666;
  text-align: center;
`;
