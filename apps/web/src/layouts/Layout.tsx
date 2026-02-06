import { useMediaQuery, useRequest } from '@zeroDraw/common';
import { ConfigProvider, Skeleton, theme } from 'antd';
import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import Dot from '../componenets/Dot';
import { getUserInfo } from '../services/login';
import { useUserStore } from '../store/useUserStore';

const Root = styled.div<{ $theme: any }>`
  width: 100%;
  min-height: 100vh;
  background: ${({ $theme }) => ($theme === 'dark' ? '#000' : '#fff')};
`;

function Layout() {
  const [windowTheme] = useMediaQuery();
  const { setUser } = useUserStore();
  const algorithm = useMemo(() => {
    return windowTheme === 'dark' ? theme.darkAlgorithm : theme.compactAlgorithm;
  }, [windowTheme]);

  const { loading } = useRequest(getUserInfo, {
    onSuccess: (data) => {
      if (data) {
        setUser(data as any);
      }
    },
  });

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: '20px',
        }}
      >
        <Skeleton active />
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: [algorithm, theme.compactAlgorithm],
      }}
    >
      <Root $theme={windowTheme}>
        <Outlet />
        <Dot />
      </Root>
    </ConfigProvider>
  );
}

export default Layout;
