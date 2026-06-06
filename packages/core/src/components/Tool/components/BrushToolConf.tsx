import { Scroller } from '@core/components/Scroller';
import Fetch from '@core/fetch';
import { useRequest } from '@zeroDraw/common';
import type { BrushJSON, SettingName } from '@zeroDraw/wasm';
import { BUILTIN_BRUSHES, SETTINGS } from '@zeroDraw/wasm';
import { Flex, Popover, Select, Slider, Space } from 'antd';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../../store/useDrawing';
import BrushPreview from '../../Layers/components/BrushPreview';

const SECTIONS: { title: string; params: [SettingName, string][] }[] = [
  {
    title: '笔触',
    params: [
      ['hardness', '硬度'],
      ['dabs_per_actual_radius', '笔触密度'],
      ['direction_filter', '方向过滤'],
    ],
  },
  {
    title: '形状',
    params: [
      ['elliptical_dab_ratio', '椭圆比'],
      ['elliptical_dab_angle', '椭圆角度'],
    ],
  },
  {
    title: '散布',
    params: [
      ['offset_by_random', '抖动'],
      ['tracking_noise', '轨迹噪声'],
      ['slow_tracking', '平滑跟踪'],
    ],
  },
  {
    title: '涂抹',
    params: [
      ['smudge', '涂抹'],
      ['smudge_length', '涂抹衰减'],
      ['paint_mode', '颜料模式'],
    ],
  },
  {
    title: '色彩',
    params: [
      ['change_color_h', '色相漂移'],
      ['change_color_v', '明度漂移'],
    ],
  },
];

const fmtVal = (v: number, step: number) => {
  if (step >= 1) return v.toFixed(0);
  if (step >= 0.1) return v.toFixed(1);
  return v.toFixed(2);
};

const BrushToolConf = () => {
  const { lineConfig, setLineConfig } = useDrawingStore(
    useShallow((state) => ({
      lineConfig: state.lineConfig,
      setLineConfig: state.setLineConfig,
    }))
  );

  const { data } = useRequest(() => Fetch.getAssetList({}));

  const brushes = useMemo(() => {
    const builtins = Object.entries(BUILTIN_BRUSHES).map(([name, config]) => ({
      id: `builtin-${name}`,
      name,
      config: config as BrushJSON,
    }));
    const remote = (data?.brushes?.list || []).map((b) => ({
      id: b.id,
      name: b.name,
      config: b.config as unknown as BrushJSON,
    }));
    return [...builtins, ...remote];
  }, [data]);

  const selectedId = useMemo(
    () => brushes.find((b) => b.name === lineConfig.brushName)?.id,
    [brushes, lineConfig.brushName]
  );

  const handleSelectBrush = (id: string) => {
    const brush = brushes.find((b) => b.id === id);
    if (!brush) return;
    setLineConfig({ ...lineConfig, brushName: brush.name, brushConfig: brush.config as any });
  };

  const currentConfig: BrushJSON =
    (lineConfig.brushConfig as BrushJSON) ||
    (BUILTIN_BRUSHES[lineConfig.brushName as keyof typeof BUILTIN_BRUSHES] as BrushJSON) ||
    (BUILTIN_BRUSHES['印象派'] as BrushJSON);

  const getVal = (name: SettingName) =>
    currentConfig.settings[name]?.base_value ?? SETTINGS[name].def;

  const updateParam = (name: SettingName, value: number) => {
    const newConfig: BrushJSON = {
      ...currentConfig,
      settings: {
        ...currentConfig.settings,
        [name]: { ...currentConfig.settings[name], base_value: value },
      },
    };
    setLineConfig({ ...lineConfig, brushConfig: newConfig as any });
  };

  return (
    <Scroller style={{ maxHeight: 420, padding: '8px' }}>
      <div style={{ padding: '0 12px 10px' }}>
        <Select
          value={selectedId}
          onChange={handleSelectBrush}
          style={{ width: '100%' }}
          getPopupContainer={(trigger) => trigger.parentElement!}
          options={brushes.map((b) => ({ label: b.name, value: b.id }))}
          optionRender={(option: any) => {
            const brush = brushes.find((b) => b.id === option.value);
            if (!brush) return option.label;
            return (
              <Popover
                arrow={false}
                mouseEnterDelay={0.2}
                placement="right"
                trigger="hover"
                content={<BrushPreview config={brush.config} />}
                styles={{ content: { padding: 6, background: 'var(--color-bg-container)' } }}
              >
                <div>{brush.name}</div>
              </Popover>
            );
          }}
        />
      </div>

      {SECTIONS.map((sec) => (
        <div key={sec.title} style={{ padding: '0 12px 8px' }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            {sec.title}
          </div>
          <Flex vertical gap={4}>
            {sec.params.map(([name, label]) => {
              const info = SETTINGS[name];
              const val = getVal(name);
              const step = info.max - info.min <= 1 ? 0.01 : info.max - info.min <= 10 ? 0.1 : 1;
              return (
                <Space key={name} direction="vertical" style={{ width: '100%' }}>
                  <Flex justify="space-between">
                    <span style={{ fontSize: 12 }}>{label}</span>
                    <span style={{ fontSize: 12 }}>{fmtVal(val, step)}</span>
                  </Flex>
                  <Slider
                    style={{ width: '100%', margin: 0 }}
                    min={info.min}
                    max={info.max}
                    step={step}
                    value={val}
                    onChange={(v) => updateParam(name, v)}
                  />
                </Space>
              );
            })}
          </Flex>
        </div>
      ))}
    </Scroller>
  );
};

export default BrushToolConf;
