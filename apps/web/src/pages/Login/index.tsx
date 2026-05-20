import { githubClientId } from '@/utils';
import { GithubOutlined, LoadingOutlined, UserOutlined } from '@ant-design/icons';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { useUnmount } from '@zeroDraw/common';
import { Carousel } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { guestLogin } from '../../services/login';
import { useUserStore } from '../../store/useUserStore';

const SLIDES = ['/image-1.jpg', '/image-2.jpg', '/image-3.jpg', '/image-4.jpg'];

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ---- layout ---- */

const Page = styled.div`
  display: flex;
  height: 100dvh;
  overflow: hidden;
  background: rgb(22, 22, 22);
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 50%;
  padding: 48px;
  background: rgb(22, 22, 22);
  animation: ${fadeUp} 0.6s ease-out;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    padding: 32px 24px;
  }
`;

const Right = styled.div`
  width: 50%;
  padding: 24px 24px 24px 0;
  display: flex;
  flex-shrink: 0;

  @media (max-width: 768px) {
    display: none;
  }
`;

const CarouselWrapper = styled.div`
  flex: 1;
  border-radius: 20px;
  overflow: hidden;
  height: 100%;

  .ant-carousel {
    height: 100% !important;
  }
`;

const StyledCarousel = styled(Carousel)`
  height: 100% !important;
  border-radius: 20px;

  .slick-list,
  .slick-track,
  .slick-slide,
  .slick-slide > div {
    height: 100% !important;
  }

  .slick-dots {
    bottom: 20px;

    li button {
      background: rgba(255, 255, 255, 0.5);
      border-radius: 3px;
      height: 4px;
    }

    li.slick-active button {
      background: #fff;
      width: 20px;
    }
  }
`;

const SlideImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const Logo = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.5px;
  margin-bottom: 38px;
  width: 100%;
  max-width: 360px;
`;

const FormContent = styled.div`
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Subtitle = styled.p`
  margin: 0 0 24px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.6;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.2);
  font-size: 12px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const GithubButton = styled.button<{ $loading?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 13px 0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: ${({ $loading }) => ($loading ? 'wait' : 'pointer')};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .anticon {
    font-size: 17px;
  }
`;

const GuestButton = styled.button<{ $loading?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 13px 0;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 14px;
  font-weight: 500;
  cursor: ${({ $loading }) => ($loading ? 'wait' : 'pointer')};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.7);
  }

  .anticon {
    font-size: 15px;
  }
`;

const Footer = styled.div`
  margin-top: 32px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.2);
  text-align: center;
  width: 100%;
  max-width: 360px;
`;

const Login = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const { user, setUser } = useUserStore();
  const navigate = useNavigate();

  const handleGithubLogin = () => {
    if (loading) return;
    const client_id = githubClientId;
    const redirect_uri = window.location.origin + '/auth';
    const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}`;
    window.open(url, '_self');
    setLoading(true);
  };

  useUnmount(() => setLoading(false));

  const handleGuestLogin = async () => {
    if (guestLoading) return;
    setGuestLoading(true);
    try {
      const fp = await FingerprintJS.load();
      const { visitorId } = await fp.get();
      const { token, user } = await guestLogin(visitorId);
      localStorage.setItem('token', token);
      setUser(user as any);
      navigate('/');
    } finally {
      setGuestLoading(false);
    }
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <Page>
      <Left>
        <Logo>ZeroDraw</Logo>
        <FormContent>
          <Subtitle>{t('login.subtitle1')}</Subtitle>
          <Subtitle>{t('login.subtitle2')}</Subtitle>
          <GithubButton $loading={loading} onClick={handleGithubLogin}>
            {loading ? <LoadingOutlined /> : <GithubOutlined />}
            {loading ? t('login.redirecting') : t('login.continueWithGithub')}
          </GithubButton>
          <Divider>{t('login.or')}</Divider>
          <GuestButton $loading={guestLoading} onClick={handleGuestLogin}>
            {guestLoading ? <LoadingOutlined /> : <UserOutlined />}
            {guestLoading ? t('login.loading') : t('login.continueAsGuest')}
          </GuestButton>
        </FormContent>
        <Footer>{t('login.copyright', { year: new Date().getFullYear() })}</Footer>
      </Left>

      <Right>
        <CarouselWrapper>
          <StyledCarousel autoplay autoplaySpeed={4000} dots effect="fade">
            {SLIDES.map((src, i) => (
              <SlideImg key={i} src={src} alt="" />
            ))}
          </StyledCarousel>
        </CarouselWrapper>
      </Right>
    </Page>
  );
};

export default Login;
