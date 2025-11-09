import { useMediaQuery } from '@monorepo/common';
import { theme } from 'antd';
import React from 'react';

const { useToken } = theme;

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Container: React.FC<ContainerProps> = ({ children, style, ...rest }) => {
  const { token } = useToken();
  const { colorBgContainer, colorText, colorInfoActive } = token;

  const [windowTheme] = useMediaQuery();

  const cssVariables = {
    '--container-bg': colorBgContainer,
    '--container-color': colorText,
    '--container-active': colorInfoActive,
    //custo,
    '--container-hover-bg':
      windowTheme === 'dark' ? 'rgba(60, 60, 62, 1)' : 'rgba(240, 240, 240, 1)',
  } as React.CSSProperties;

  return (
    <div style={{ ...cssVariables, ...style }} {...rest}>
      {children}
    </div>
  );
};

export default React.memo(Container);
