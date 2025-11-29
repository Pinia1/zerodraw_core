import styled from 'styled-components';

export const ToolItem = styled.div<{ $active?: boolean; $disabled?: boolean }>`
  background-color: ${({ $active }) =>
    $active ? 'var(--container-active) !important' : 'transparent'};

  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 100%;
  border-radius: 8px;
  transition: background-color 0.3s ease;
  position: relative;
  color: ${({ $disabled }) => ($disabled ? 'rgb(128, 128, 128)' : '')};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};

  &:hover {
    background-color: ${({ $disabled }) =>
      $disabled ? 'transparent' : 'var(--container-hover-bg)'};
  }
`;
