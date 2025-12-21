import Konva from 'konva';
import React, { useImperativeHandle, useMemo, useState } from 'react';
import { Group, Layer as KonvaLayer, Rect as KonvaRect } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import useLayerStore from '../../store/useLayer';
import useToolsStore from '../../store/useTools';
import { Actions } from '../../types/Drawing';
import {
  Diagram,
  DiagramPropsMap,
  Ellipse as EllipseType,
  Fill as FillType,
  Lasso as LassoType,
  Line as LineType,
  Rect as RectType,
} from '../../types/Layers';
import Ellipse from './Diagram/Ellipse';
import Eraser from './Diagram/Eraser';
import EraserLasso from './Diagram/EraserLasso';
import Fill from './Diagram/Fill';
import Image from './Diagram/Image';
import Lasso from './Diagram/Lasso';
import Line from './Diagram/Lines';
import Paths from './Diagram/Paths';
import Rect from './Diagram/Rect';

type DiagramProps<T extends Diagram['type']> = DiagramPropsMap[T];

export interface ActiveDiagramState {
  type: Diagram['type'];
  props: DiagramProps<Diagram['type']>;
}

export interface ActiveDiagramRef {
  activeDiagram: ActiveDiagramState | null;
  setActiveDiagram: React.Dispatch<React.SetStateAction<ActiveDiagramRef['activeDiagram']>>;
}

const ActiveDiagram = React.forwardRef<ActiveDiagramRef, object>((_props, ref) => {
  const [activeDiagram, setActiveDiagram] = useState<ActiveDiagramState | null>(null);

  const { layerConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
    }))
  );
  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );

  const { opacity } = useLayerStore(
    useShallow((state) => ({
      opacity: state.drawingLayer?.opacity,
    }))
  );

  useImperativeHandle(ref, () => ({
    setActiveDiagram,
    activeDiagram,
  }));

  const RenderDiagram = useMemo(() => {
    switch (activeDiagram?.type) {
      case 'remove':
      case 'path': {
        return <Paths {...(activeDiagram.props as LineType)} removeTag={false} />;
      }
      case 'image': {
        return <Image {...(activeDiagram.props as FillType)} draggable={false} />;
      }

      case 'fill': {
        return <Fill {...(activeDiagram.props as FillType)} />;
      }
      case 'eraserLine': {
        return <Eraser {...(activeDiagram.props as LineType)} />;
      }
      case 'rect': {
        return <Rect {...(activeDiagram.props as RectType)} />;
      }
      case 'ellipse': {
        return <Ellipse {...(activeDiagram.props as EllipseType)} />;
      }
      case 'line': {
        return <Line {...(activeDiagram.props as Konva.LineConfig)} />;
      }

      case 'eraseLasso': {
        return <EraserLasso {...(activeDiagram.props as LassoType)} />;
      }
      default:
        return null;
    }
  }, [activeDiagram]);

  return (
    <KonvaLayer
      x={layerConfig.x}
      y={layerConfig.y}
      clipWidth={layerConfig.width}
      clipHeight={layerConfig.height}
      visible={true}
    >
      <Group clipWidth={layerConfig.width} clipHeight={layerConfig.height}>
        {RenderDiagram}
      </Group>
      {activeKey === Actions.LASSO && activeDiagram?.type === 'lasso' && (
        <Lasso {...(activeDiagram?.props as LassoType)} />
      )}

      <KonvaRect
        x={0}
        y={0}
        listening={false}
        width={layerConfig.width}
        height={layerConfig.height}
        id="rect_for_placeholder"
        fill={layerConfig.backgroundColor}
        globalCompositeOperation={'destination-out'}
        opacity={1 - (opacity ?? 100) / 100}
      />
    </KonvaLayer>
  );
});

export default React.memo(ActiveDiagram);
