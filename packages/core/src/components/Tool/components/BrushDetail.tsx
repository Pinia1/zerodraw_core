import Icon from '@ant-design/icons';
import { Flex } from 'antd';
import { useShallow } from 'zustand/react/shallow';
import { IconRefer } from '../../../icons';
import useToolsStore from '../../../store/useTools';
import { Actions } from '../../../types/Drawing';
import Container from '../../Container';
import BrushConf from './BrushConf';
import FillConf from './FillConf';

const BrushDetail = () => {
  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );

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
        <span>Settings</span>
        <Icon style={{ cursor: 'pointer' }} component={IconRefer} />
      </Flex>

      {activeKey === Actions.FILL && <FillConf />}
      {[Actions.PEN, Actions.ERASER].includes(activeKey) && <BrushConf />}
    </Container>
  );
};

export default BrushDetail;
