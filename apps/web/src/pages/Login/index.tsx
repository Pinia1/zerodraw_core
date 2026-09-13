import { UserOutlined } from '@ant-design/icons';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { guestLogin } from '../../services/login';
import { useUserStore } from '../../store/useUserStore';

const Page = styled.div`
  display: flex;
  min-height: 100dvh;
  align-items: center;
  justify-content: center;
  background: #161616;
  padding: 24px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 360px;
  padding: 32px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #111;
`;

const Title = styled.h1`
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
`;

const Subtitle = styled.p`
  margin: 0 0 24px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.6;
`;

const GuestButton = styled.button<{ $loading?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 13px 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: ${({ $loading }) => ($loading ? 'wait' : 'pointer')};

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
`;

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, setUser } = useUserStore();
  const [loading, setLoading] = useState(false);

  if (user || localStorage.getItem('token')) {
    return <Navigate to="/" replace />;
  }

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const fp = await FingerprintJS.load();
      const { visitorId } = await fp.get();
      const { token, user: guestUser } = await guestLogin(visitorId);
      localStorage.setItem('token', token);
      setUser(guestUser);
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <Card>
        <Title>Agent Studio</Title>
        <Subtitle>框架演示：Studio 对话 + Flow 画布 + Agent 监控</Subtitle>
        <GuestButton type="button" $loading={loading} disabled={loading} onClick={() => void handleGuestLogin()}>
          <UserOutlined />
          {loading ? '登录中…' : '访客登录'}
        </GuestButton>
      </Card>
    </Page>
  );
}
