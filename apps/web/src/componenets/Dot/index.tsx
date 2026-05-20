import { Avatar, Dropdown, Flex } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import i18n from '../../i18n';
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useUserStore();

  const handleSwitchLang = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  return (
    <Dropdown
      placement="top"
      menu={{
        items: [
          {
            label: t('dot.homePage'),
            key: 'home',
            onClick: () => {
              navigate('/projects');
            },
          },
          {
            label: t('dot.switchLang'),
            key: 'switchLang',
            onClick: handleSwitchLang,
          },
          {
            label: t('dot.logout'),
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
