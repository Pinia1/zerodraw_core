import Icon from '@ant-design/icons';
import { useThrottleFn } from '@monorepo/common';
import { Flex } from 'antd';
import React from 'react';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import { IconEyeClose, IconEyeOpen } from '../../icons';
import { useDrawingStore } from '../../store/useDrawing';
import { LayerConfigTypes } from '../../types/Drawing';
import Container from '../Container';
import { ToolItem } from '../index';

const Wrapper = styled(Container)`
  width: 100%;
  display: grid;
  grid-template-columns: 32px 62px minmax(0px, 1fr) 32px;
  padding: 8px 4px;
  -webkit-box-align: center;
  align-items: center;
  gap: 4px;
  user-select: none;
  min-height: 64px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: rgb(36, 36, 37);
  font-size: 14px;
`;

interface BackgroundControlProps {}

const BackgroundControl: React.FC<BackgroundControlProps> = () => {
  const { layerConfig, setLayerConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      setLayerConfig: state.setLayerConfig,
    }))
  );

  const { run: handleSetConfig } = useThrottleFn(
    (config: Partial<LayerConfigTypes>) => {
      setLayerConfig({ ...layerConfig, ...config });
    },
    {
      wait: 16,
    }
  );

  return (
    <Wrapper style={{ marginTop: 10 }}>
      <Flex align="center" justify="center">
        <ToolItem
          style={{ aspectRatio: 1, fontSize: 16 }}
          $active={false}
          onClick={() => handleSetConfig({ backgroundVisible: !layerConfig.backgroundVisible })}
        >
          <Icon component={layerConfig.backgroundVisible ? IconEyeOpen : IconEyeClose} />
        </ToolItem>
      </Flex>

      <Flex
        style={{
          aspectRatio: 16 / 9,
          borderRadius: 4,
          background: layerConfig.backgroundColor,
          position: 'relative',
        }}
        align="center"
        justify="center"
      >
        <input
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
          }}
          type="color"
          onChange={(e) => handleSetConfig({ backgroundColor: e.target.value })}
        />
      </Flex>
      <Flex
        style={{
          borderRadius: 4,
          fontSize: 13,
        }}
        vertical
        justify="space-around"
      >
        <span>Background</span>
        <span>{layerConfig.backgroundColor?.replace('#', '').toUpperCase()}</span>
      </Flex>
    </Wrapper>
  );
};

export default React.memo(BackgroundControl);
