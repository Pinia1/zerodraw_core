import { CloseOutlined, MoreOutlined } from '@ant-design/icons';
import type { ColorItem } from '@zeroDraw/api-contract';
import { Button, Dropdown } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

interface ColorDetailPopoverProps {
  color: ColorItem;
  onClose: () => void;
  onUse: (hex: string) => void;
  onEdit?: (color: ColorItem) => void;
  onDelete?: (color: ColorItem) => void;
}

const Wrapper = styled.div`
  width: 250px;
  padding: 8px;
  border-radius: 12px;
  background: var(--color-bg-container);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-secondary);
`;

const IconButton = styled.button`
  border: none;
  padding: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 16px;
`;

const Preview = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 112px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: var(--color-fill-tertiary);
`;

const PreviewColor = styled.div<{ $color: string }>`
  width: 72px;
  height: 72px;
  border-radius: 8px;
  background: ${({ $color }) => $color};
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 10px 8px;
  margin-bottom: 12px;
`;

const Label = styled.div`
  color: var(--color-text-secondary);
`;

const Value = styled.div`
  font-weight: 600;
`;

const Author = styled.div`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
`;

const Avatar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #88b82d;
  color: #152006;
  font-weight: 700;
`;

const Muted = styled.div`
  color: var(--color-text-secondary);
  font-size: 13px;
`;

const getRelativeTime = (
  timestamp: number,
  t: (key: string, params?: Record<string, unknown>) => string
) => {
  const diff = Math.max(0, Date.now() - new Date(timestamp).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('assets.justNow');
  if (minutes < 60) return t('assets.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('assets.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('assets.daysAgo', { count: days });
};

const getCurrentUser = (): { username?: string; name?: string } | null => {
  try {
    const raw = localStorage.getItem('user-storage');
    if (!raw) return null;
    const data = JSON.parse(raw) as { state?: { user?: { username?: string; name?: string } } };
    return data.state?.user || null;
  } catch {
    return null;
  }
};

const ColorDetailPopover = ({
  color,
  onClose,
  onUse,
  onEdit,
  onDelete,
}: ColorDetailPopoverProps) => {
  const { t } = useTranslation();
  const hex = color.hex.toUpperCase();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const displayName = currentUser?.username || currentUser?.name || t('assets.currentUser');
  const avatarText = displayName.charAt(0).toUpperCase();

  return (
    <Wrapper>
      <Header>
        {t('assets.details')}
        <Actions>
          <Dropdown
            placement="bottom"
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'edit',
                  label: t('assets.edit'),
                  onClick: () => {
                    onClose();
                    onEdit?.(color);
                  },
                },
                {
                  key: 'delete',
                  label: t('assets.delete'),
                  onClick: () => onDelete?.(color),
                },
              ],
            }}
          >
            <IconButton type="button" aria-label={t('assets.moreActions')}>
              <MoreOutlined />
            </IconButton>
          </Dropdown>
          <IconButton type="button" aria-label={t('assets.close')} onClick={onClose}>
            <CloseOutlined />
          </IconButton>
        </Actions>
      </Header>

      <Preview>
        <PreviewColor $color={color.hex} />
      </Preview>

      <MetaGrid>
        <Label>{t('assets.name')}</Label>
        <Value>{color.name || hex}</Value>
        <Label>{t('assets.hex')}</Label>
        <Value>{hex}</Value>
      </MetaGrid>

      <Author>
        <Avatar>{avatarText}</Avatar>
        <div>
          <Muted>{displayName}</Muted>
          <Muted>{getRelativeTime(color.createdAt, t)}</Muted>
        </div>
      </Author>

      <Button type="primary" block onClick={() => onUse(color.hex)}>
        {t('assets.useAsset')}
      </Button>
    </Wrapper>
  );
};

export default ColorDetailPopover;
