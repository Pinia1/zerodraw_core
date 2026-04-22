import { Tooltip } from 'antd';
import styled, { createGlobalStyle } from 'styled-components';
export const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 2px;
  padding-top: 0px;
`;

export const EmptyWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
`;

export const EmptyText = styled.div`
  font-size: 14px;
  color: #999;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

export const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

export const Count = styled.span`
  font-size: 13px;
`;

export const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  cursor: default;
  padding-right: 4px;
  height: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #d9d9d9;
    border-radius: 3px;

    &:hover {
      background: #bfbfbf;
    }
  }
`;

export const MasonryStyles = createGlobalStyle`
  .lib-masonry {
    display: flex;
    margin-left: -12px;
    width: auto;
    
  }
  .lib-masonry-column {
    padding-left: 12px;
    background-clip: padding-box;
  }
  .lib-masonry-column > div {
    margin-bottom: 12px;
  }
`;

export const LoadMoreWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 0;
`;

export const ImageCard = styled.div`
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
  cursor: pointer;
  position: relative;
  aspect-ratio: 1;

  img {
    display: block;
    width: 100%;
  }
`;

export const ImageCardMask = styled.div<{ $isHover: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  padding: 8px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.45) 0%, transparent 60%);
  opacity: ${({ $isHover }) => ($isHover ? 1 : 0)};
  transition: opacity 0.2s ease-in-out;
  pointer-events: ${({ $isHover }) => ($isHover ? 'auto' : 'none')};
`;

export const ActionButtonWrapper = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
`;

export const ActionButton = ({
  children,
  onClick,
  tooltip,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tooltip?: string;
}) => {
  return (
    <Tooltip title={tooltip}>
      <ActionButtonWrapper
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        {children}
      </ActionButtonWrapper>
    </Tooltip>
  );
};
