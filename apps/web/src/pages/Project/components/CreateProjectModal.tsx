import { Modal } from 'antd';
import React, { useState } from 'react';
import styled from 'styled-components';

// ─── 比例配置 ────────────────────────────────────────────────────────────────
const LONG_SIDE = 1920;

export interface RatioOption {
  label: string;
  w: number;
  h: number;
  width: number;
  height: number;
}

function makeOption(label: string, w: number, h: number): RatioOption {
  const ratio = w / h;
  const isLandscape = ratio >= 1;
  const width = isLandscape ? LONG_SIDE : Math.round(LONG_SIDE * ratio);
  const height = isLandscape ? Math.round(LONG_SIDE / ratio) : LONG_SIDE;
  return { label, w, h, width, height };
}

export const RATIO_OPTIONS: RatioOption[] = [
  makeOption('16 : 9',  16, 9),
  makeOption('21 : 9',  21, 9),
  makeOption('4 : 3',   4,  3),
  makeOption('5 : 4',   5,  4),
  makeOption('1 : 1',   1,  1),
  makeOption('4 : 5',   4,  5),
  makeOption('3 : 4',   3,  4),
  makeOption('9 : 16',  9,  16),
];

// ─── Styles ──────────────────────────────────────────────────────────────────
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 8px 0 4px;
`;

const Card = styled.div<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px 10px;
  border-radius: 10px;
  border: 1.5px solid ${({ $active }) => ($active ? '#6254e8' : 'rgba(255,255,255,0.1)')};
  background: ${({ $active }) => ($active ? 'rgba(98,84,232,0.12)' : 'rgba(255,255,255,0.03)')};
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  &:hover {
    border-color: ${({ $active }) => ($active ? '#6254e8' : 'rgba(255,255,255,0.25)')};
    background: ${({ $active }) => ($active ? 'rgba(98,84,232,0.15)' : 'rgba(255,255,255,0.06)')};
  }
`;

const Preview = styled.div<{ $w: number; $h: number }>`
  /* 在 48×48 区域内按比例居中绘制矩形 */
  width: ${({ $w, $h }) => {
    const r = $w / $h;
    return r >= 1 ? '44px' : `${Math.round(44 * ($w / $h))}px`;
  }};
  height: ${({ $w, $h }) => {
    const r = $w / $h;
    return r < 1 ? '44px' : `${Math.round(44 / ($w / $h))}px`;
  }};
  min-width: 12px;
  min-height: 12px;
  border-radius: 3px;
  border: 1.5px solid currentColor;
`;

const Label = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #e0e0e0;
  white-space: nowrap;
`;

const Dimension = styled.span`
  font-size: 10px;
  color: #666;
  white-space: nowrap;
`;

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  loading?: boolean;
  onConfirm: (option: RatioOption) => void;
  onCancel: () => void;
}

const CreateProjectModal: React.FC<Props> = ({ open, loading, onConfirm, onCancel }) => {
  const [selected, setSelected] = useState<RatioOption>(RATIO_OPTIONS[0]);

  return (
    <Modal
      open={open}
      title="New File"
      okText="Create"
      cancelText="Cancel"
      onOk={() => onConfirm(selected)}
      onCancel={onCancel}
      confirmLoading={loading}
      width={480}
      styles={{
        content: { background: '#1c1c1c', padding: '20px 24px' },
        header: { background: '#1c1c1c', borderBottom: 'none', paddingBottom: 0 },
        footer: { borderTop: 'none', background: '#1c1c1c' },
        mask: { backdropFilter: 'blur(2px)' },
      }}
      okButtonProps={{
        style: { background: '#6254e8', borderColor: '#6254e8', borderRadius: 7 },
      }}
      cancelButtonProps={{ style: { borderRadius: 7 } }}
    >
      <Grid>
        {RATIO_OPTIONS.map((opt) => (
          <Card
            key={opt.label}
            $active={selected.label === opt.label}
            onClick={() => setSelected(opt)}
          >
            <Preview
              $w={opt.w}
              $h={opt.h}
              style={{ color: selected.label === opt.label ? '#6254e8' : '#555' }}
            />
            <Label>{opt.label}</Label>
            <Dimension>
              {opt.width} × {opt.height}
            </Dimension>
          </Card>
        ))}
      </Grid>
    </Modal>
  );
};

export default CreateProjectModal;
