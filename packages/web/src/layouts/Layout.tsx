import { ConfigProvider } from 'antd';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';

const Root = styled.div`
  width: 100%;
  height: 100%;
`;

function Layout() {
  return (
    <ConfigProvider>
      <Root>
        <Outlet />
      </Root>
    </ConfigProvider>
  );
}

export default Layout;
