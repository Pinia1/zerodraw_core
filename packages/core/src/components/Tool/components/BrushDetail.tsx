import Icon from '@ant-design/icons';
import { Flex, Slider, Space } from 'antd';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { IconRefer } from '../../../icons';
import { useDrawingStore } from '../../../store/useDrawing';
import useToolsStore from '../../../store/useTools';
import { Actions, EraserConfigTypes, LineConfigTypes } from '../../../types/Drawing';
import Container from '../../Container';

const BrushDetail = () => {
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

  const handleSetConfig = (key: keyof LineConfigTypes | keyof EraserConfigTypes, value: number) => {
    if (activeKey === Actions.ERASER) {
      setEraserConfig({ ...eraserConfig, [key]: value });
    } else {
      setLineConfig({ ...lineConfig, [key]: value });
    }
  };

  return (
    <Container>
      <Flex
        style={{
          width: '100%',
          padding: 12,
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid var(--border-color)',
          fontSize: 14,
        }}
      >
        <span>Brush Settings</span>
        <Icon style={{ cursor: 'pointer' }} component={IconRefer} />
      </Flex>
      <Flex gap={16} style={{ width: '100%', padding: '8px 12px' }}>
        <Flex flex={1} vertical gap={4}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Flex flex={1} justify="space-between">
              <span>Size</span>
              <span>{config.strokeWidth}px</span>
            </Flex>
            <Flex flex={1} justify="space-between">
              <Slider
                style={{ width: '100%', margin: 0 }}
                min={1}
                max={250}
                onChange={(value) => {
                  handleSetConfig('strokeWidth', value);
                }}
                value={config.strokeWidth}
              />
            </Flex>
          </Space>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Flex flex={1} justify="space-between">
              <span>Opacity</span>
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
                  <span>Smoothness</span>
                  <span>{lineConfig.tension}x</span>
                </Flex>
                <Flex flex={1} justify="space-between">
                  <Slider
                    style={{ width: '100%', margin: 0 }}
                    min={0}
                    max={2}
                    step={0.5}
                    onChange={(value) => {
                      handleSetConfig('tension', value);
                    }}
                    value={lineConfig.tension}
                  />
                </Flex>
              </Space>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Flex flex={1} justify="space-between">
                  <span>Hardness</span>
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
              <Space direction="vertical" style={{ width: '100%' }}>
                <Flex flex={1} justify="space-between">
                  <span>Shake correction</span>
                  <span>{lineConfig.stabilizer}</span>
                </Flex>
                <Flex flex={1} justify="space-between">
                  <Slider
                    style={{ width: '100%', margin: 0 }}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(value) => {
                      handleSetConfig('stabilizer', value);
                    }}
                    value={lineConfig.stabilizer}
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
    </Container>
  );
};

export default BrushDetail;
