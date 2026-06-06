import { Flex, Slider, Space, Switch } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../../store/useDrawing';
import useToolsStore from '../../../store/useTools';
import { Actions, EraserConfigTypes, LineConfigTypes } from '../../../types/Drawing';

const BrushConf = () => {
  const { t } = useTranslation();
  const { lineConfig, setLineConfig, eraserConfig, setEraserConfig, fillColor, setFillColor } =
    useDrawingStore(
      useShallow((state) => ({
        lineConfig: state.lineConfig,
        setLineConfig: state.setLineConfig,
        eraserConfig: state.eraserConfig,
        setEraserConfig: state.setEraserConfig,
        fillColor: state.fillColor,
        setFillColor: state.setFillColor,
      }))
    );
  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );

  const config = useMemo(() => {
    if (activeKey === Actions.ERASER) {
      return eraserConfig;
    }
    return lineConfig;
  }, [activeKey, eraserConfig, lineConfig]);

  const handleSetConfig = (key: keyof LineConfigTypes | keyof EraserConfigTypes, value: any) => {
    if (activeKey === Actions.ERASER) {
      setEraserConfig({ ...eraserConfig, [key]: value });
    } else {
      setLineConfig({ ...lineConfig, [key]: value });
    }
  };

  return (
    <>
      <Flex gap={16} style={{ width: '100%', padding: '8px 12px' }}>
        <Flex flex={1} vertical gap={6}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Flex flex={1} justify="space-between">
              <span>{t('brushConf.size')}</span>
              <span>{config.strokeWidth}px</span>
            </Flex>
            <Flex flex={1} justify="space-between">
              <Slider
                style={{ width: '100%', margin: 0 }}
                min={1}
                max={100}
                onChange={(value) => {
                  handleSetConfig('strokeWidth', value);
                }}
                value={config.strokeWidth}
              />
            </Flex>
          </Space>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Flex flex={1} justify="space-between">
              <span>{t('brushConf.opacity')}</span>
              <span>{Math.round(config.opacity * 100)}%</span>
            </Flex>
            <Flex flex={1} justify="space-between">
              <Slider
                style={{ width: '100%', margin: 0 }}
                min={0}
                max={100}
                step={1}
                onChange={(value) => {
                  handleSetConfig('opacity', value / 100);
                }}
                value={config.opacity * 100}
              />
            </Flex>
          </Space>
          {activeKey === Actions.PEN && (
            <>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Flex flex={1} justify="space-between">
                  <span>{t('brushConf.smoothness')}</span>
                  <span>{lineConfig.stabilizer}x</span>
                </Flex>
                <Flex flex={1} justify="space-between">
                  <Slider
                    style={{ width: '100%', margin: 0 }}
                    min={0}
                    max={2}
                    step={0.5}
                    onChange={(value) => {
                      handleSetConfig('stabilizer', value);
                    }}
                    value={lineConfig.stabilizer}
                  />
                </Flex>
              </Space>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Flex flex={1} justify="space-between">
                  <span>{t('brushConf.hardness')}</span>
                  <span>{Math.round(lineConfig.hardness * 100)}%</span>
                </Flex>
                <Flex flex={1} justify="space-between">
                  <Slider
                    style={{ width: '100%', margin: 0 }}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(value) => {
                      handleSetConfig('hardness', value / 100);
                    }}
                    value={lineConfig.hardness * 100}
                  />
                </Flex>
              </Space>
            </>
          )}
        </Flex>
        <Flex align="center" justify="center" style={{ width: 80, marginBottom: 'auto' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexShrink: '0',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              overflow: 'hidden',
              border: '2px solid var(--border-color)',
              borderRadius: '10px',
            }}
          >
            <div
              style={{
                width: config.strokeWidth,
                height: config.strokeWidth,
                backgroundColor: fillColor,
                borderRadius: '50%',
                flexShrink: 0,
              }}
            ></div>
            <input
              onChange={(e) => setFillColor(e.target.value)}
              type="color"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
              }}
            />
          </div>
        </Flex>
      </Flex>
      {activeKey === Actions.PEN && (
        <Flex style={{ width: '100%', padding: 12, gap: 12 }}>
          <Flex align="center" gap={6}>
            <span>{t('brushConf.fill')}</span>
            <Switch
              size="small"
              checked={lineConfig.fill}
              onChange={(value: boolean) => handleSetConfig('fill', value)}
            />
          </Flex>
          <Flex align="center" gap={6}>
            <span>{t('brushConf.pressure')}</span>
            <Switch
              size="small"
              checked={lineConfig.suppress}
              onChange={(value: boolean) => handleSetConfig('suppress', value)}
            />
          </Flex>
          <Flex align="center" gap={6}>
            <span>{t('brushConf.amendment')}</span>
            <Switch
              size="small"
              checked={lineConfig.amendment ?? true}
              onChange={(value: boolean) => handleSetConfig('amendment', value)}
            />
          </Flex>
        </Flex>
      )}
      {activeKey === Actions.PEN && (lineConfig.amendment ?? true) && (
        <Flex style={{ width: '100%', padding: '0 12px 12px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Flex justify="space-between">
              <span>{t('brushConf.amendmentStrength')}</span>
              <span>{Math.round((lineConfig.amendmentStrength ?? 0.72) * 100)}%</span>
            </Flex>
            <Slider
              style={{ width: '100%', margin: 0 }}
              min={50}
              max={95}
              step={1}
              value={Math.round((lineConfig.amendmentStrength ?? 0.72) * 100)}
              onChange={(value) => handleSetConfig('amendmentStrength', value / 100)}
            />
          </Space>
        </Flex>
      )}
    </>
  );
};

export default BrushConf;
