import { Avatar, Dropdown, Flex } from 'antd';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useUserStore } from '../../store/useUserStore';

const DotContainer = styled(Flex)`
  position: fixed;
  bottom: 48px;
  left: 48px;
  gap: 8px;
  font-size: 12px;
  align-items: center;
  user-select: none;
`;

const Dot = () => {
  const navigate = useNavigate();
  const { user, logout } = useUserStore();

  return (
    <Dropdown
      placement="top"
      menu={{
        items: [
          {
            label: 'Logout',
            key: 'logout',
            onClick: () => {
              logout();
              navigate('/login');
            },
          },
        ],
      }}
    >
      <DotContainer>
        <Avatar src={user?.avatar} />
        <span>{user?.username}</span>
      </DotContainer>
    </Dropdown>
  );
};

export default Dot;
