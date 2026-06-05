import { CloseOutlined } from '@ant-design/icons';
import { Button, Input, message, Select } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

interface SaveColorDialogProps {
  open: boolean;
  loading?: boolean;
  initialColor?: string;
  title?: string;
  onClose: () => void;
  onSave: (hex: string) => void;
}

type ColorFormat = 'hex' | 'rgb' | 'hsl';

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
  padding: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
`;

const CloseButton = styled.button`
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 16px;
`;

const ColorInput = styled(Input)`
  height: 30px;
  margin-bottom: 8px;
  border: none;
  border-radius: 8px;
  background: var(--color-fill-tertiary);
  font-weight: 700;
`;

const Spectrum = styled.div<{ $hueColor: string }>`
  position: relative;
  height: 112px;
  margin-bottom: 6px;
  border-radius: 8px;
  background:
    linear-gradient(to bottom, rgba(255, 255, 255, 0), #000),
    linear-gradient(to right, #fff, ${({ $hueColor }) => $hueColor});
  touch-action: none;
  cursor: pointer;
`;

const PickerHandle = styled.span<{ $x: number; $y: number }>`
  position: absolute;
  left: ${({ $x }) => `${$x * 100}%`};
  top: ${({ $y }) => `${$y * 100}%`};
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
  transform: translate(-50%, -50%);
  pointer-events: none;
`;

const HueRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  gap: 6px;
  margin-bottom: 6px;
  align-items: center;
`;

const Hue = styled.div`
  position: relative;
  height: 16px;
  border-radius: 999px;
  background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
  overflow: hidden;
  touch-action: none;
  cursor: pointer;
`;

const HueHandle = styled.span<{ $x: number }>`
  position: absolute;
  left: ${({ $x }) => `${$x * 100}%`};
  top: 50%;
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
  transform: translate(-50%, -50%);
  pointer-events: none;
`;

const Eyedropper = styled.button`
  height: 30px;
  border: none;
  border-radius: 8px;
  background: var(--color-fill-tertiary);
  color: var(--color-text);
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EyedropperIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10.8 1.7a1.8 1.8 0 0 1 2.55 2.55l-1.2 1.2.7.7a.5.5 0 0 1-.7.7l-.7-.7-5.8 5.8a2.5 2.5 0 0 1-1.4.7l-2.05.35.35-2.05a2.5 2.5 0 0 1 .7-1.4l5.8-5.8-.7-.7a.5.5 0 0 1 .7-.7l.7.7 1.05-1.05Zm-.1 4.2L9.75 4.95l-5.45 5.45a1.5 1.5 0 0 0-.42.84l-.14.82.82-.14a1.5 1.5 0 0 0 .84-.42L10.7 5.9Z"
      fill="currentColor"
    />
  </svg>
);

const HexRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 56px;
  gap: 6px;
`;

const ColorValueInputs = styled.div<{ $columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns = 1 }) => $columns}, minmax(0, 1fr));
  gap: 2px;
`;

const ValueInput = styled(Input)`
  text-align: center;

  .ant-input {
    text-align: center;
  }
`;

const Footer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--container-border-color);
`;

const normalizeHex = (value: string) => {
  const clean = value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
  return clean ? `#${clean}` : '#000000';
};

const displayHex = (value: string) => normalizeHex(value).replace('#', '').toUpperCase();

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const componentToHex = (value: number) => value.toString(16).padStart(2, '0');

const hsvToHex = (h: number, s: number, v: number) => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return `#${componentToHex(Math.round((r + m) * 255))}${componentToHex(
    Math.round((g + m) * 255)
  )}${componentToHex(Math.round((b + m) * 255))}`;
};

const hexToHsv = (hex: string) => {
  const normalized = normalizeHex(hex).replace('#', '').padEnd(6, '0');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }

  return {
    h: h < 0 ? h + 360 : h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex).replace('#', '').padEnd(6, '0');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbToHsl = (r: number, g: number, b: number) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }

  return {
    h: Math.round(h < 0 ? h + 360 : h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

const hslToHex = (h: number, s: number, l: number) => {
  const sn = clamp(s / 100);
  const ln = clamp(l / 100);
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return `#${componentToHex(Math.round((r + m) * 255))}${componentToHex(
    Math.round((g + m) * 255)
  )}${componentToHex(Math.round((b + m) * 255))}`;
};

const formatColorValue = (hex: string, format: ColorFormat) => {
  if (format === 'hex') return displayHex(hex);

  const { r, g, b } = hexToRgb(hex);
  if (format === 'rgb') return `${r}, ${g}, ${b}`;

  const { h, s, l } = rgbToHsl(r, g, b);
  return `${h}, ${s}%, ${l}%`;
};

const parseColorValue = (value: string, format: ColorFormat) => {
  if (format === 'hex') return normalizeHex(value);

  const values = value.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (format === 'rgb') {
    const [r = 0, g = 0, b = 0] = values;
    return `#${componentToHex(Math.round(clamp(r, 0, 255)))}${componentToHex(
      Math.round(clamp(g, 0, 255))
    )}${componentToHex(Math.round(clamp(b, 0, 255)))}`;
  }

  const [h = 0, s = 0, l = 0] = values;
  return hslToHex(((h % 360) + 360) % 360, clamp(s, 0, 100), clamp(l, 0, 100));
};

const getColorChannels = (hex: string, format: ColorFormat) => {
  const { r, g, b } = hexToRgb(hex);
  if (format === 'rgb') return [r, g, b];

  const { h, s, l } = rgbToHsl(r, g, b);
  return [h, s, l];
};

const SaveColorDialog = ({
  open,
  loading,
  initialColor = '#000000',
  title,
  onClose,
  onSave,
}: SaveColorDialogProps) => {
  const { t } = useTranslation();
  const spectrumRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [hsv, setHsv] = useState(() => hexToHsv(initialColor));
  const [format, setFormat] = useState<ColorFormat>('hex');

  const color = useMemo(() => hsvToHex(hsv.h, hsv.s, hsv.v), [hsv]);
  const hueColor = useMemo(() => hsvToHex(hsv.h, 1, 1), [hsv.h]);

  useEffect(() => {
    if (open) setHsv(hexToHsv(initialColor));
  }, [initialColor, open]);

  const handleHexChange = (value: string) => {
    setHsv(hexToHsv(parseColorValue(value, format)));
  };

  const handleChannelChange = (index: number, value: string) => {
    const channels = getColorChannels(color, format);
    channels[index] = Number(value) || 0;

    if (format === 'rgb') {
      setHsv(hexToHsv(parseColorValue(channels.join(','), 'rgb')));
      return;
    }

    setHsv(hexToHsv(parseColorValue(channels.join(','), 'hsl')));
  };

  const updateSpectrum = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = spectrumRef.current?.getBoundingClientRect();
    if (!rect) return;
    const s = clamp((event.clientX - rect.left) / rect.width);
    const v = 1 - clamp((event.clientY - rect.top) / rect.height);
    setHsv((current) => ({ ...current, s, v }));
  };

  const updateHue = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) return;
    const h = clamp((event.clientX - rect.left) / rect.width) * 360;
    setHsv((current) => ({ ...current, h }));
  };

  const pickScreenColor = async () => {
    const EyeDropperCtor = (
      window as typeof window & {
        EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
      }
    ).EyeDropper;

    if (!EyeDropperCtor) {
      message.warning(t('assets.eyeDropperUnsupported'));
      return;
    }

    try {
      const result = await new EyeDropperCtor().open();
      setHsv(hexToHsv(result.sRGBHex));
    } catch {
      // The user can cancel the native eyedropper; no feedback needed.
    }
  };

  return (
    <Wrapper>
      <Header>
        {title || t('assets.saveColorInFile')}
        <CloseButton type="button" onClick={onClose} aria-label={t('assets.close')}>
          <CloseOutlined />
        </CloseButton>
      </Header>

      <ColorInput
        value={color.toUpperCase()}
        onChange={(event) => handleHexChange(event.target.value)}
      />

      <Spectrum
        ref={spectrumRef}
        $hueColor={hueColor}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateSpectrum(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) updateSpectrum(event);
        }}
      >
        <PickerHandle $x={hsv.s} $y={1 - hsv.v} />
      </Spectrum>

      <HueRow>
        <Hue
          ref={hueRef}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            updateHue(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) updateHue(event);
          }}
        >
          <HueHandle $x={hsv.h / 360} />
        </Hue>
        <Eyedropper type="button" aria-label={t('assets.pickColor')} onClick={pickScreenColor}>
          <EyedropperIcon />
        </Eyedropper>
      </HueRow>

      <HexRow>
        {format === 'hex' ? (
          <Input
            value={formatColorValue(color, format)}
            onChange={(event) => handleHexChange(event.target.value)}
          />
        ) : (
          <ColorValueInputs $columns={3}>
            {getColorChannels(color, format).map((value, index) => (
              <ValueInput
                key={index}
                value={value}
                onChange={(event) => handleChannelChange(index, event.target.value)}
              />
            ))}
          </ColorValueInputs>
        )}
        <Select<ColorFormat>
          value={format}
          options={[
            { label: t('assets.hex'), value: 'hex' },
            { label: 'RGB', value: 'rgb' },
            { label: 'HSL', value: 'hsl' },
          ]}
          onChange={(value) => setFormat(value)}
        />
      </HexRow>

      <Footer>
        <Button type="text" onClick={onClose}>
          {t('assets.cancel')}
        </Button>
        <Button type="primary" loading={loading} onClick={() => onSave(color)}>
          {t('assets.save')}
        </Button>
      </Footer>
    </Wrapper>
  );
};

export default SaveColorDialog;
