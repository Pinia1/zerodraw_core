import { Popover } from 'antd';
import React from 'react';
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
  const style: React.CSSProperties = {
    position: 'fixed',
    display: visible ? 'block' : 'none',
    color: 'red',
    left: position?.x,
    top: position?.y,
    zIndex: 1031,
  };

  return ReactDOM.createPortal(
    <div style={style} onClick={(e) => e.stopPropagation()}>
      <Popover
        arrow={false}
        content={content}
        trigger="click"
        open={true}
        zIndex={1031}
        onOpenChange={(open) => {
          if (!open) {
            setVisible(false);
          }
        }}
        styles={{
          body: {
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
