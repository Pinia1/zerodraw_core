import { useMediaQuery } from '@monorepo/common';
import { ConfigProvider, theme } from 'antd';
import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';

const Root = styled.div`
  width: 100%;
  min-height: 100vh;
`;

function Layout() {
  const [windowTheme] = useMediaQuery();

  const algorithm = useMemo(() => {
    return windowTheme === 'dark' ? theme.darkAlgorithm : theme.compactAlgorithm;
  }, [windowTheme]);

  return (
    <ConfigProvider
      theme={{
        algorithm: [algorithm, theme.compactAlgorithm],
      }}
    >
      <Root>
        <Outlet />
      </Root>
    </ConfigProvider>
  );
}

export default Layout;
