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
    //custom,
    '--container-hover-bg':
      windowTheme === 'dark' ? 'rgba(60, 60, 62, 1)' : 'rgba(240, 240, 240, 1)',
    '--container-box-shadow':
      windowTheme === 'dark'
        ? `
          rgba(0, 0, 0, 0.25) 0px 2px 4px 0px, rgba(180, 180, 180, 0.25) 0px 0.5px 1px 0px inset
        `
        : `
       rgba(0, 0, 0, 0.25) 0px 2px 4px 0px, rgba(180, 180, 180, 0.25) 0px 0.5px 1px 0px inset
    `,
    '--container-border-color':
      windowTheme === 'dark' ? 'rgb(36, 36, 37)' : 'rgba(240, 240, 240, 1)',
  } as React.CSSProperties;

  return (
    <div style={{ ...cssVariables, ...style }} {...rest}>
      {children}
    </div>
  );
};

export default React.memo(Container);
