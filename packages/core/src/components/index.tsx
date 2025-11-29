import styled from 'styled-components';

export const ToolItem = styled.div<{ $active: boolean }>`
  background-color: ${({ $active }) =>
    $active ? 'var(--container-active) !important' : 'transparent'};

  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 100%;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  position: relative;

  &:hover {
    background-color: var(--container-hover-bg);
  }
`;
