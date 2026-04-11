import { Layout } from 'antd';
import styled from 'styled-components';

// ─── Styled Components ────────────────────────────────────────────────────────
export const AppLayout = styled(Layout)`
  height: 100dvh;
  overflow: hidden;
  background: #111 !important;
`;

export const StyledSider = styled(Layout.Sider)`
  && {
    background: #1a1a1a !important;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .ant-layout-sider-children {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
`;

export const SidebarTop = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 0 0;
  &::-webkit-scrollbar {
    width: 0;
  }
`;

export const SidebarBottom = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 8px 0;
`;

export const WorkspaceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  margin: 0 8px 8px;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

export const WorkspaceAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
`;

export const WorkspaceInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

export const WorkspaceName = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const SearchWrapper = styled.div`
  margin: 0 8px 4px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  .ant-input-affix-wrapper {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 5px 10px;
  }
  .ant-input {
    background: transparent !important;
    color: #ccc !important;
    font-size: 12.5px;
    &::placeholder {
      color: #666 !important;
    }
  }
`;

export const TeamDotIcon = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: #22c55e;
  flex-shrink: 0;
`;

export const UpgradeCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px;
  margin: 0 8px 4px;
  text-align: center;
`;

export const UpgradeIcon = styled.div`
  font-size: 18px;
  color: #a78bfa;
  margin-bottom: 4px;
`;

export const UserRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 4px;
`;

export const UserInfo = styled.div`
  min-width: 0;
`;

export const UserName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #ddd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const UserEmail = styled.div`
  font-size: 10.5px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// ─── Main Area ────────────────────────────────────────────────────────────────
export const Main = styled(Layout.Content)`
  && {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #111;
  }
`;

export const MainHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 12px;
`;

export const PageTitle = styled.h1`
  font-size: 18px;
  font-weight: 700;
  color: #e8e8e8;
  margin: 0;
`;

export const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px 16px;
`;

export const FilterLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const FilterButton = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: #aaa;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ddd;
  }
`;

export const ViewToggle = styled.div`
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

export const ViewBtn = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  cursor: pointer;
  font-size: 13px;
  color: ${({ $active }) => ($active ? '#e0e0e0' : '#666')};
  background: ${({ $active }) => ($active ? 'rgba(255, 255, 255, 0.12)' : 'transparent')};
  transition:
    background 0.15s,
    color 0.15s;
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #ccc;
  }
`;

export const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px;
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
`;

export const CardGrid = styled.div<{ $list: boolean }>`
  display: ${({ $list }) => ($list ? 'flex' : 'grid')};
  flex-direction: ${({ $list }) => ($list ? 'column' : 'unset')};
  grid-template-columns: ${({ $list }) =>
    $list ? 'unset' : 'repeat(auto-fill, minmax(200px, 1fr))'};
  gap: ${({ $list }) => ($list ? '4px' : '16px')};
`;

export const ProjectCard = styled.div<{ $list: boolean }>`
  border-radius: 10px;
  overflow: hidden;
  background: #1c1c1c;
  border: 1px solid rgba(255, 255, 255, 0.07);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  display: ${({ $list }) => ($list ? 'flex' : 'block')};
  align-items: ${({ $list }) => ($list ? 'center' : 'unset')};
  &:hover {
    border-color: rgba(255, 255, 255, 0.18);
    background: #222;
  }
`;

export const CardThumbnail = styled.div<{ $list: boolean }>`
  width: ${({ $list }) => ($list ? '80px' : '100%')};
  min-width: ${({ $list }) => ($list ? '80px' : 'unset')};
  aspect-ratio: ${({ $list }) => ($list ? 'unset' : '16/9')};
  height: ${({ $list }) => ($list ? '46px' : 'unset')};
  background: #222;
  overflow: hidden;
  flex-shrink: 0;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

export const EmptyThumb = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const CardInfo = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 10px 10px 12px;
  gap: 6px;
  flex: 1;
  min-width: 0;
`;

export const CardInfoLeft = styled.div`
  flex: 1;
  min-width: 0;
`;

export const CardName = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: #ddd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const CardMeta = styled.div`
  font-size: 11px;
  color: #666;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const PaginationBar = styled.div`
  display: flex;
  justify-content: center;
  padding: 20px 0 4px;
  .ant-pagination-item,
  .ant-pagination-prev,
  .ant-pagination-next {
    background: transparent;
    border-color: rgba(255, 255, 255, 0.12);
    a, button { color: #999; }
    &:hover { border-color: rgba(255, 255, 255, 0.3); a, button { color: #ddd; } }
  }
  .ant-pagination-item-active {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    a { color: #e0e0e0; }
  }
  .ant-pagination-disabled button { color: #444 !important; }
`;

export const MoreBtn = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  color: #777;
  flex-shrink: 0;
  opacity: 0;
  transition:
    opacity 0.15s,
    background 0.15s;
  ${ProjectCard}:hover & {
    opacity: 1;
  }
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ccc;
  }
`;
