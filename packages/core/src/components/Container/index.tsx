import { theme } from 'antd';
import React from 'react';

const { useToken } = theme;

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Container: React.FC<ContainerProps> = ({ children, style, ...rest }) => {
  const { token } = useToken();
  const { colorBgContainer, colorText, colorInfoActive } = token;

  const cssVariables = {
    '--container-bg': colorBgContainer,
    '--container-color': colorText,
    '--container-active': colorInfoActive,
  } as React.CSSProperties;

  return (
    <div style={{ ...cssVariables, ...style }} {...rest}>
      {children}
    </div>
  );
};

export default React.memo(Container);
