import { useMediaQuery, useRequest } from '@monorepo/common';
import { ConfigProvider, theme } from 'antd';
import { useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { getUserInfo } from '../services/login';

const Root = styled.div`
  width: 100%;
  min-height: 100vh;
`;

function Layout() {
  const [windowTheme] = useMediaQuery();
  const navigate = useNavigate();
  const algorithm = useMemo(() => {
    return windowTheme === 'dark' ? theme.darkAlgorithm : theme.compactAlgorithm;
  }, [windowTheme]);

  useRequest(getUserInfo, {
    onSuccess: (data) => {
      if (data) {
        console.log(data, 'userinfo');
      }
    },
  });

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
