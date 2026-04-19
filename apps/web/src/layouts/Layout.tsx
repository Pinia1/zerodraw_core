import { useMediaQuery, useRequest } from '@zeroDraw/common';
import { Layout as AntdLayout, ConfigProvider, Skeleton, theme } from 'antd';
import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import Dot from '../componenets/Dot';
import { getUserInfo } from '../services/login';
import { useUserStore } from '../store/useUserStore';
import Aside from './components/Aside';

export const Root = styled.div<{ $theme: any }>`
  width: 100%;
  min-height: 100vh;
  background: ${({ $theme }) => ($theme === 'dark' ? '#000' : '#fff')};
`;

const Main = styled(AntdLayout.Content)`
  && {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #111;
  }
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
      <ConfigProvider
        theme={{
          algorithm: [algorithm, theme.compactAlgorithm],
        }}
      >
        <Root $theme={windowTheme} style={{ padding: '20px' }}>
          <Skeleton active />
        </Root>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: [algorithm, theme.compactAlgorithm],
      }}
    >
      <Root style={{ display: 'flex' }} $theme={windowTheme}>
        <Aside />

        <Main>
          <Outlet />
        </Main>

        <Dot />
      </Root>
    </ConfigProvider>
  );
}

export default Layout;
