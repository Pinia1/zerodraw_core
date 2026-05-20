import Icon from '@ant-design/icons';
import { Icons } from '@zeroDraw/core';
import { Dropdown } from 'antd';

interface DropMenuProps {
  children: React.ReactNode;
}
const MENU_ITEMS = [
  { key: 'new_view', icon: <Icon component={Icons.IconViews} />, label: 'New view' },
  { key: 'expression', icon: <Icon component={Icons.IconFace} />, label: 'Change expression' },
];
const DropMenu: React.FC<DropMenuProps> = ({ children }) => {
  return (
    <Dropdown placement="bottomRight" menu={{ items: MENU_ITEMS }} trigger={['click']}>
      {children}
    </Dropdown>
  );
};

export default DropMenu;
