import { DownOutlined, PlusOutlined } from '@ant-design/icons';
import { BrushItem, ColorItem, ImageItem, PaletteItem, PromptItem } from '@zeroDraw/api-contract';
import { Popover } from 'antd';
import { useState } from 'react';
import styled from 'styled-components';

export enum AssetType {
  Project = 'project',
  All = 'all',
}

export interface AssetPanelProps {
  colors: ColorItem[];
  palettes: PaletteItem[];
  images: ImageItem[];
  prompts: PromptItem[];
  brushes: BrushItem[];
  loading?: boolean;
}

export const Wrapper = styled.div`
  height: 100%;
  overflow-y: auto;
  padding: 2px 0 20px;
  color: var(--color-text);
`;

export const Toolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 2px 10px 12px;
`;

export const Controls = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
`;

export const Section = styled.section`
  border-top: 1px solid var(--container-border-color);
  padding: 14px 14px 10px;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 600;
`;

export const SectionTitle = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  padding: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
`;

export const CollapseIcon = styled(DownOutlined)<{ $collapsed?: boolean }>`
  font-size: 11px;
  transition: transform 0.18s ease;
  transform: rotate(${({ $collapsed }) => ($collapsed ? '-90deg' : '0deg')});
`;

export const SectionContent = styled.div<{ $collapsed?: boolean }>`
  display: grid;
  grid-template-rows: ${({ $collapsed }) => ($collapsed ? '0fr' : '1fr')};
  opacity: ${({ $collapsed }) => ($collapsed ? 0 : 1)};
  transition:
    grid-template-rows 0.2s ease,
    opacity 0.16s ease;
`;

export const SectionContentInner = styled.div`
  min-height: 0;
  overflow: hidden;
`;

export const AddButton = styled.button`
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 16px;
`;

export const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
`;

export const ColorSwatch = styled.div<{ $color: string }>`
  width: 46px;
  height: 46px;
  border-radius: 6px;
  border: 2px solid rgba(255, 255, 255, 0.18);
  background: ${({ $color }) => $color};
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
  cursor: pointer;
`;

export const PaletteList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const PaletteCard = styled.div`
  overflow: hidden;
  border: 1px solid var(--container-border-color);
  border-radius: 8px;
`;

export const PaletteColors = styled.div`
  display: flex;
  height: 58px;
`;

export const PaletteColor = styled.div<{ $color: string }>`
  flex: 1;
  min-width: 36px;
  background: ${({ $color }) => $color};
`;

export const PaletteName = styled.div`
  padding: 6px 4px 0;
  color: var(--color-text-secondary);
`;

export const ImageGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const ImageCard = styled.div`
  width: 54px;
  height: 54px;
  overflow: hidden;
  border: 1px solid var(--container-border-color);
  border-radius: 6px;
  background: var(--color-fill-tertiary);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

export const PromptList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const PromptCard = styled.div`
  padding: 10px;
  border-radius: 8px;
  background: var(--color-fill-tertiary);
`;

export const PromptTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

export const PromptContent = styled.div`
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-secondary);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

export const EmptyCard = styled.div`
  padding: 20px 14px;
  border-radius: 8px;
  background: var(--color-fill-tertiary);
  text-align: center;
  color: var(--color-text-secondary);
`;

export const EmptyTitle = styled.div`
  margin-bottom: 10px;
  color: var(--color-text);
  font-weight: 700;
`;

export const filterText = (value: string | null | undefined, keyword: string) =>
  !keyword || value?.toLowerCase().includes(keyword.toLowerCase());

export const AssetSection = ({
  title,
  children,
  onAdd,
  addPopoverContent,
  addPopoverOpen,
  onAddPopoverOpenChange,
}: {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
  addPopoverContent?: React.ReactNode;
  addPopoverOpen?: boolean;
  onAddPopoverOpenChange?: (open: boolean) => void;
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const addButton = (
    <AddButton type="button" aria-label={`Add ${title}`} onClick={onAdd}>
      <PlusOutlined />
    </AddButton>
  );

  return (
    <Section>
      <SectionHeader>
        <SectionTitle
          type="button"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <CollapseIcon $collapsed={collapsed} />
          {title}
        </SectionTitle>
        {addPopoverContent ? (
          <Popover
            arrow={false}
            content={addPopoverContent}
            open={addPopoverOpen}
            placement="rightTop"
            trigger="click"
            styles={{ content: { padding: 0, background: 'transparent' } }}
            onOpenChange={onAddPopoverOpenChange}
          >
            {addButton}
          </Popover>
        ) : (
          addButton
        )}
      </SectionHeader>
      <SectionContent $collapsed={collapsed}>
        <SectionContentInner>{children}</SectionContentInner>
      </SectionContent>
    </Section>
  );
};
