import { Avatar, Dropdown, Flex } from 'antd';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useUserStore } from '../../store/useUserStore';

const DotContainer = styled(Flex)`
  position: fixed;
  bottom: 2rem;
  left: 48px;
  gap: 8px;
  font-size: 12px;
  align-items: center;
  user-select: none;
  -webkit-user-select: none;
  color: #fff;
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
            label: 'home page',
            key: 'home',
            onClick: () => {
              navigate('/projects');
            },
          },
          {
            label: 'help',
            key: 'help',
            onClick: () => {
              //@ts-ignore
              window.open(import.meta.env.VITE_DOCS_URL);
            },
          },
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
        <Avatar src={user?.avatar || '/cat.jpg'} />
        <span>{user?.username}</span>
      </DotContainer>
    </Dropdown>
  );
};

export default Dot;
