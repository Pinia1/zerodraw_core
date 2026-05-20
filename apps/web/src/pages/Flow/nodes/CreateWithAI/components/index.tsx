import styled from 'styled-components';

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 12px;
  padding-top: 12px;
  font-size: 16px;
`;

export const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Title = styled.span`
  font-weight: 600;
  line-height: 1;
`;

export const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 12px;
`;

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
  border-radius: 12px;
  padding: 12px;
  border: 1px solid transparent;
  transition:
    border-color 0.2s,
    background-color 0.2s;
  background: var(--color-fill-tertiary, rgba(40, 40, 42, 0.5));

  &:hover {
  }

  &:focus-within {
    border-color: var(--color-primary-active, #722ed1);
    background: var(--color-fill-tertiary, rgba(40, 40, 42, 0.8));
  }
`;

export const ImagePreview = styled.div`
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
    display: block;
  }
`;

export const RemoveButton = styled.div`
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #5b4bd5;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #7c6fe0;
  }
`;

export const EditorArea = styled.div`
  flex: 1;
  min-height: 40px;

  .prompt-editor {
    outline: none;
    font-size: 14px;
    line-height: 1.6;
    color: var(--container-color, #e0e0e0);
    min-height: 40px;

    p {
      margin: 0;
    }

    /* placeholder */
    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: #666;
      pointer-events: none;
      height: 0;
    }

    /* @ mention 标签 */
    .mention {
      background: rgba(91, 75, 213, 0.2);
      color: #a78bfa;
      border-radius: 4px;
      padding: 1px 4px;
      font-weight: 500;
      box-decoration-break: clone;
    }
  }
`;

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
`;

export const ToolGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const ToolButton = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--container-color, #999);
  font-size: 16px;
  transition: background 0.2s;

  &:hover {
    background: var(--container-hover-bg, rgba(60, 60, 62, 1));
  }
`;

export const SubmitBtn = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 10px;
  background: #5b4bd5;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;

  &:hover {
    background: #7c6fe0;
  }
`;

export const MentionedImages = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const MentionedThumb = styled.div`
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
    display: block;
  }
`;

export const Badge = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #5b4bd5;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

/* ==================== 底部表单 ==================== */

export const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 12px 4px;
`;

export const FormRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const FormLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: var(--container-color, #e0e0e0);
`;
