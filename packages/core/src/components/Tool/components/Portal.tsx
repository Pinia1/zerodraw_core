import { useClickAway } from '@zeroDraw/common';
import { Popover } from 'antd';
import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import { Point2D } from '../../../types/Drawing';

interface PortalConfProps {
  visible?: boolean;
  position?: Point2D;
  setVisible: (visible: boolean) => void;
  content?: React.ReactNode;
  popoverStyles?: React.CSSProperties;
}

const Portal: React.FC<PortalConfProps> = ({
  visible = false,
  position,
  setVisible,
  content,
  popoverStyles,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useClickAway(() => {
    setVisible(false);
  }, ref);

  const style: React.CSSProperties = {
    position: 'fixed',
    display: visible ? 'block' : 'none',
    color: 'red',
    left: position?.x,
    top: position?.y,
    zIndex: 1031,
  };

  return ReactDOM.createPortal(
    <div ref={ref} style={style} onClick={(e) => e.stopPropagation()}>
      <Popover
        arrow={false}
        content={content}
        trigger="click"
        open={visible}
        zIndex={1031}
        styles={{
          container: {
            ...popoverStyles,
          },
        }}
        getPopupContainer={(parent) => parent.parentElement as HTMLElement}
      >
        <></>
      </Popover>
    </div>,
    document.body
  );
};

export default Portal;
