import Icon from '@ant-design/icons';
import { useMemoizedFn } from '@zeroDraw/common';
import { Icons } from '@zeroDraw/core';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

/* ==================== 常量 ==================== */

const MIN_PIXELS = 3_686_400;
const MAX_PIXELS = 16_777_216;

/** 分辨率预设 */
type Resolution = '2K' | '4K';
const RESOLUTION_BASE: Record<Resolution, number> = {
  '2K': 2048,
  '4K': 4096,
};

/** 比例预设：label + icon 文字 + 比例值(w/h) */
const RATIOS = [
  { key: 'auto', label: 'auto', ratio: 0 },
  { key: '1:1', label: '1:1', ratio: 1, '2k': '2048x2048', '4k': '4096x4096' },
  { key: '3:4', label: '3:4', ratio: 3 / 4, '2k': '1728x2304', '4k': '3520x4704' },
  { key: '4:3', label: '4:3', ratio: 4 / 3, '2k': '2304x1728', '4k': '4704x3520' },
  { key: '16:9', label: '16:9', ratio: 16 / 9, '2k': '2560x1440', '4k': '5504x3040' },
  { key: '9:16', label: '9:16', ratio: 9 / 16, '2k': '1440x2560', '4k': '3040x5504' },
  { key: '2:3', label: '2:3', ratio: 2 / 3, '2k': '1664x2496', '4k': '3328x4992' },
  { key: '3:2', label: '3:2', ratio: 3 / 2, '2k': '2496x1664', '4k': '4992x3328' },
  { key: '21:9', label: '21:9', ratio: 21 / 9, '2k': '3024x1296', '4k': '6240x2656' },
] as const;

/* ==================== 类型 ==================== */

export interface SizeValue {
  width: number;
  height: number;
}

interface SizeProps {
  value?: SizeValue;
  onChange?: (value: SizeValue) => void;
}

/* ==================== 工具函数 ==================== */

/** 根据分辨率 + 比例算出 w/h，保证像素在范围内 */
function calcSize(base: number, ratio: number): SizeValue {
  // ratio = 0 表示 "智能"，退化为 1:1
  const r = ratio || 1;
  let w: number, h: number;
  if (r >= 1) {
    w = base;
    h = Math.round(base / r);
  } else {
    h = base;
    w = Math.round(base * r);
  }
  return clampSize(w, h);
}

function clampSize(w: number, h: number): SizeValue {
  const pixels = w * h;
  if (pixels < MIN_PIXELS) {
    const scale = Math.sqrt(MIN_PIXELS / pixels);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  } else if (pixels > MAX_PIXELS) {
    const scale = Math.sqrt(MAX_PIXELS / pixels);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  return { width: w, height: h };
}

/* ==================== 组件 ==================== */

/** 根据 w×h 反向匹配预设的 resolution + ratio */
function matchPreset(
  w: number,
  h: number
): { resolution: Resolution | null; ratioKey: string | null } {
  const sizeStr = `${w}x${h}`;
  for (const ratio of RATIOS) {
    const rec = ratio as unknown as Record<string, string>;
    if (rec['2k'] === sizeStr) return { resolution: '2K', ratioKey: ratio.key };
    if (rec['4k'] === sizeStr) return { resolution: '4K', ratioKey: ratio.key };
  }
  return { resolution: null, ratioKey: null };
}

const Size: React.FC<SizeProps> = ({ value, onChange }) => {
  const [resolution, setResolution] = useState<Resolution | null>('2K');
  const [ratioKey, setRatioKey] = useState<string | null>('1:1');
  const [width, setWidth] = useState(value?.width ?? 2048);
  const [height, setHeight] = useState(value?.height ?? 2048);

  // 点击分辨率 / 比例 → 使用预设固定像素
  useEffect(() => {
    // 只在主动选中时触发，null 表示自定义态，不自动计算
    if (resolution === null || ratioKey === null) return;

    const ratioItem = RATIOS.find((r) => r.key === ratioKey);
    const resKey = resolution === '2K' ? '2k' : '4k';
    const preset =
      ratioItem && resKey in ratioItem
        ? (ratioItem as unknown as Record<string, string>)[resKey]
        : undefined;
    let w: number, h: number;
    if (preset && preset.includes('x')) {
      const [pw, ph] = preset.split('x').map(Number);
      w = pw;
      h = ph;
    } else {
      // auto / 无预设时回退到计算
      const base = RESOLUTION_BASE[resolution];
      const currentRatio = ratioItem?.ratio ?? 1;
      ({ width: w, height: h } = calcSize(base, currentRatio));
    }
    setWidth(w);
    setHeight(h);
    onChange?.({ width: w, height: h });
  }, [resolution, ratioKey]);

  const handleWidthChange = useMemoizedFn((val: string) => {
    const w = Math.max(1, parseInt(val) || 0);
    const h = height;
    setWidth(w);
    onChange?.({ width: w, height: h });
    // 反向匹配预设
    const matched = matchPreset(w, h);
    setResolution(matched.resolution);
    setRatioKey(matched.ratioKey);
  });

  const handleHeightChange = useMemoizedFn((val: string) => {
    const h = Math.max(1, parseInt(val) || 0);
    const w = width;
    setHeight(h);
    onChange?.({ width: w, height: h });
    // 反向匹配预设
    const matched = matchPreset(w, h);
    setResolution(matched.resolution);
    setRatioKey(matched.ratioKey);
  });

  const pixelCount = width * height;
  const isValid = pixelCount >= MIN_PIXELS && pixelCount <= MAX_PIXELS;

  return (
    <Container className="nodrag">
      <SectionLabel>resolution </SectionLabel>
      <ToggleGroup>
        {(['2K', '4K'] as Resolution[]).map((r) => (
          <ToggleBtn
            key={r}
            $active={resolution === r}
            onClick={() => {
              setResolution(r);
              // 如果比例也是 null，默认选回 1:1
              if (ratioKey === null) setRatioKey('1:1');
            }}
          >
            {r}
          </ToggleBtn>
        ))}
      </ToggleGroup>

      <SectionLabel>Ratio</SectionLabel>
      <RatioGroup>
        {RATIOS.map((r) => (
          <RatioBtn
            key={r.key}
            $active={ratioKey === r.key}
            onClick={() => {
              setRatioKey(r.key);
              // 如果分辨率也是 null，默认选回 2K
              if (resolution === null) setResolution('2K');
            }}
          >
            <RatioIcon $ratio={r.ratio || 1}>
              <div />
            </RatioIcon>
            <RatioLabel>{r.label}</RatioLabel>
          </RatioBtn>
        ))}
      </RatioGroup>

      <SectionLabel>Size</SectionLabel>
      <DimensionRow>
        <DimensionField>
          <DimLabel>W</DimLabel>
          <DimInput
            type="number"
            value={width}
            onChange={(e) => handleWidthChange(e.target.value)}
          />
        </DimensionField>

        <LinkButton>
          <Icon component={Icons.IconLock} />
        </LinkButton>

        <DimensionField>
          <DimLabel>H</DimLabel>
          <DimInput
            type="number"
            value={height}
            onChange={(e) => handleHeightChange(e.target.value)}
          />
        </DimensionField>
      </DimensionRow>

      {!isValid && (
        <ErrorText>
          The total pixel count must be between {(MIN_PIXELS / 1e6).toFixed(1)}M and{' '}
          {(MAX_PIXELS / 1e6).toFixed(0)}M
        </ErrorText>
      )}
    </Container>
  );
};

export default Size;

/* ==================== 样式 ==================== */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: var(--container-color, #e0e0e0);
  margin-top: 4px;
`;

/* 分辨率 2K / 4K 切换 */
const ToggleGroup = styled.div`
  display: flex;
  background: var(--container-hover-bg, rgba(60, 60, 62, 1));
  border-radius: 8px;
  padding: 2px;
`;

const ToggleBtn = styled.div<{ $active: boolean }>`
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: ${({ $active }) => ($active ? '#fff' : 'var(--container-color, #999)')};
  background: ${({ $active }) =>
    $active ? 'var(--color-primary-active, #5b4bd5)' : 'transparent'};
`;

/* 比例选择 */
const RatioGroup = styled.div`
  display: flex;
  gap: 2px;
  background: var(--container-hover-bg, rgba(60, 60, 62, 1));
  border-radius: 8px;
  padding: 4px 2px;
`;

const RatioBtn = styled.div<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0;
  flex: 1;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $active }) => ($active ? 'rgba(91, 75, 213, 0.15)' : 'transparent')};

  &:hover {
    background: rgba(91, 75, 213, 0.1);
  }
`;

const RatioIcon = styled.div<{ $ratio: number }>`
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;

  div {
    border: 1.5px solid currentColor;
    border-radius: 2px;
    color: var(--container-color, #999);
    ${({ $ratio }) => {
      // 在 18x18 的空间内按比例画一个小矩形
      const maxSize = 14;
      let w: number, h: number;
      if ($ratio >= 1) {
        w = maxSize;
        h = Math.round(maxSize / $ratio);
      } else {
        h = maxSize;
        w = Math.round(maxSize * $ratio);
      }
      return `width: ${Math.max(w, 4)}px; height: ${Math.max(h, 4)}px;`;
    }}
  }
`;

const RatioLabel = styled.span`
  font-size: 9px;
  color: var(--container-color, #999);
  white-space: nowrap;
`;

/* 宽高输入行 */
const DimensionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const DimensionField = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--container-hover-bg, rgba(60, 60, 62, 1));
  border-radius: 8px;
  padding: 6px 10px;
  gap: 6px;
`;

const DimLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary-active, #5b4bd5);
  user-select: none;
`;

const DimInput = styled.input`
  flex: 1;
  width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--container-color, #e0e0e0);
  font-size: 13px;
  font-weight: 500;
  text-align: right;

  /* 隐藏 number 箭头 */
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const LinkButton = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  font-size: 16px;
`;

const ErrorText = styled.div`
  font-size: 11px;
  color: #e5484d;
  padding: 0 2px;
`;
