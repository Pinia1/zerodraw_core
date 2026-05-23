import Icon from '@ant-design/icons';
import { IconSymmetry, IconVertical, IconX } from '@core/icons';
import { useDrawingStore } from '@core/store/useDrawing';
import useSymmetryStore, { SymmetryMode } from '@core/store/useSymmetry';
import { Dropdown } from 'antd';
import { useShallow } from 'zustand/react/shallow';

const SymmetryIcon = () => {
  const { mode, setMode } = useSymmetryStore();
  const { layerConfig } = useDrawingStore(
    useShallow((state) => ({ layerConfig: state.layerConfig }))
  );
  const handleClick = (key: SymmetryMode) => {
    setMode(key, { width: layerConfig.width, height: layerConfig.height });
  };
  return (
    <Dropdown
      placement="bottom"
      trigger={['click']}
      menu={{
        selectedKeys: [mode],
        items: [
          {
            key: 'Off',
            label: 'Mirroring Off',
            icon: <Icon style={{ fontSize: 16, marginRight: 10 }} component={IconX} />,
            onClick: () => handleClick('Off'),
          },
          {
            key: 'Vertical',
            label: 'Vertical Mirroring',
            icon: (
              <Icon
                style={{ transform: 'rotate(-45deg)', fontSize: 14, marginRight: 12 }}
                component={IconVertical}
              />
            ),
            onClick: () => handleClick('Vertical'),
          },
          {
            key: 'Horizontal',
            label: 'Horizontal Mirroring',
            icon: (
              <Icon
                style={{ transform: 'rotate(45deg)', fontSize: 14, marginRight: 12 }}
                component={IconVertical}
              />
            ),
            onClick: () => handleClick('Horizontal'),
          },
        ],
      }}
    >
      <Icon
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        component={IconSymmetry}
      />
    </Dropdown>
  );
};

export default SymmetryIcon;
