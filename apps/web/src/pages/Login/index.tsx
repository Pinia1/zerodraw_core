import { githubClientId } from '@/utils';
import { GithubOutlined, LoadingOutlined } from '@ant-design/icons';
import { useUnmount } from '@zeroDraw/common';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useUserStore } from '../../store/useUserStore';

/* ---- animations ---- */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 0.35; transform: scale(1); }
`;

/* ---- full-screen background ---- */

const Page = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  overflow: hidden;
  background: #0e0e1a;
`;

const BgImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(2px);
  animation: ${scaleIn} 1s ease-out forwards;
  pointer-events: none;
  user-select: none;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    rgba(14, 14, 26, 0.3) 0%,
    rgba(14, 14, 26, 0.75) 100%
  );
  pointer-events: none;
`;

/* ---- glass card ---- */

const Card = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 380px;
  padding: 44px 36px 36px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px) saturate(1.4);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
  animation: ${fadeUp} 0.7s ease-out;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.3px;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  text-align: center;
  line-height: 1.6;
`;

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 0;
`;

const GithubButton = styled.button<{ $loading?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px 0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: ${({ $loading }) => ($loading ? 'wait' : 'pointer')};
  transition: all 0.25s ease;
  letter-spacing: 0.2px;

  &:hover {
    background: rgba(255, 255, 255, 0.18);
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
    box-shadow: none;
  }

  .anticon {
    font-size: 18px;
  }
`;

const Footer = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.28);
  margin-top: 4px;
`;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useUserStore();

  const handleGithubLogin = () => {
    if (loading) return;
    const client_id = githubClientId;
    const redirect_uri = window.location.origin + '/auth';
    const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}`;
    window.open(url, '_self');
    setLoading(true);
  };

  useUnmount(() => setLoading(false));

  const time = new Date().getFullYear();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <Page>
      <BgImage src="/zero.png" alt="" />
      <Overlay />

      <Card>
        <Title>ZeroDraw</Title>
        <Subtitle>Sign in to your creative workspace</Subtitle>
        <Divider />
        <GithubButton $loading={loading} onClick={handleGithubLogin}>
          {loading ? <LoadingOutlined /> : <GithubOutlined />}
          {loading ? 'Redirecting...' : 'Continue with GitHub'}
        </GithubButton>
        <Footer>&copy; {time} ZeroDraw</Footer>
      </Card>
    </Page>
  );
};

export default Login;
