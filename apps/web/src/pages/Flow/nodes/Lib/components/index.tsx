import styled, { createGlobalStyle } from 'styled-components';
export const Wrapper = styled.div`
  width: 800px;
  height: 600px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px;
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
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
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
  padding: 16px;
  cursor: default;

  /* 美化滚动条 */
  &::-webkit-scrollbar {
    width: 6px;
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

  img {
    display: block;
    width: 100%;
  }
`;
