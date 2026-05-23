import { IconTran } from '@core/icons';
import { useMemoizedFn } from '@zeroDraw/common';
import type Konva from 'konva';
import React, { useRef } from 'react';
import { Circle, Group, Image, Layer, Line } from 'react-konva';
import useImage from 'use-image';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import useSymmetryStore from '../../store/useSymmetry';

export const Symmetry_LAYER_ID = '__interaction_symmetry_layer__';

const AXIS_COLOR = '#4a6cf7';
const HANDLE_RADIUS = 10;
const ROTATION_HANDLE_RADIUS = 6;
const ROTATION_HANDLE_HIT_RADIUS = 12;
const ROTATION_HANDLE_DISTANCE = 80;

const ANGLE_SNAP_STEP = 45;
const ANGLE_SNAP_THRESHOLD = 4;

function snapAngle(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360;
  const nearest = Math.round(normalized / ANGLE_SNAP_STEP) * ANGLE_SNAP_STEP;
  if (Math.abs(normalized - nearest) < ANGLE_SNAP_THRESHOLD) {
    return nearest >= 360 ? nearest - 360 : nearest;
  }
  return angle;
}

function getRotationHandlePosition(
  centerX: number,
  centerY: number,
  rotation: number
): { x: number; y: number } {
  const rad = (rotation * Math.PI) / 180;
  return {
    x: centerX + Math.sin(rad) * ROTATION_HANDLE_DISTANCE,
    y: centerY - Math.cos(rad) * ROTATION_HANDLE_DISTANCE,
  };
}

const Symmetry: React.FC = () => {
  const { layerConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
    }))
  );

  const { position, rotation, setPosition, setRotation } = useSymmetryStore(
    useShallow((state) => ({
      position: state.position,
      rotation: state.rotation,
      setPosition: state.setPosition,
      setRotation: state.setRotation,
    }))
  );

  const groupRef = useRef<Konva.Group>(null);
  const rotationHandleRef = useRef<Konva.Group>(null);
  const rotationProxyRef = useRef<Konva.Circle>(null);
  const rotationGuideRef = useRef<Konva.Circle>(null);

  const [tranImage] = useImage(IconTran);

  const centerX = position.x < 0 ? layerConfig.width / 2 : position.x;
  const centerY = position.y < 0 ? layerConfig.height / 2 : position.y;

  const lineLength = Math.max(layerConfig.width, layerConfig.height) * 2;
  const rotationHandlePosition = getRotationHandlePosition(centerX, centerY, rotation);

  const handleCenterDragMove = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const x = node.x();
    const y = node.y();
    groupRef.current?.position({ x, y });
    rotationGuideRef.current?.position({ x, y });

    const angle = groupRef.current?.rotation() ?? rotation;
    const handlePos = getRotationHandlePosition(x, y, angle);
    rotationHandleRef.current?.position(handlePos);
    rotationProxyRef.current?.position(handlePos);
  });

  const handleCenterDragEnd = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    setPosition({ x: node.x(), y: node.y() });
  });

  const handleRotationDragStart = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
    rotationGuideRef.current?.visible(true);
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'grabbing';
  });

  const handleRotationDragMove = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const cx = groupRef.current?.x() ?? centerX;
    const cy = groupRef.current?.y() ?? centerY;
    const dx = node.x() - cx;
    const dy = node.y() - cy;
    if (dx === 0 && dy === 0) return;
    const rawAngle = Math.atan2(dx, -dy) * (180 / Math.PI);
    const angle = snapAngle(rawAngle);
    groupRef.current?.rotation(angle);
    rotationHandleRef.current?.position(getRotationHandlePosition(cx, cy, angle));
  });

  const handleRotationDragEnd = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
    const angle = groupRef.current?.rotation() ?? rotation;
    const cx = groupRef.current?.x() ?? centerX;
    const cy = groupRef.current?.y() ?? centerY;
    const handlePos = getRotationHandlePosition(cx, cy, angle);
    rotationProxyRef.current?.position(handlePos);
    rotationGuideRef.current?.visible(false);
    setRotation(angle);
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'grab';
  });

  const previousCursor = useRef<string>('');

  const enterCursor = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>, cursor: string) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const container = stage.container();
    previousCursor.current = container.style.cursor;
    container.style.cursor = cursor;
  });

  const leaveCursor = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = previousCursor.current;
  });

  return (
    <Layer
      x={layerConfig.x}
      y={layerConfig.y}
      clipWidth={layerConfig.width}
      clipHeight={layerConfig.height}
      id={Symmetry_LAYER_ID}
    >
      <Group ref={groupRef} x={centerX} y={centerY} rotation={rotation} listening={false}>
        <Line
          points={[0, -lineLength, 0, lineLength]}
          stroke={AXIS_COLOR}
          strokeWidth={1}
          listening={false}
        />
      </Group>

      <Circle
        ref={rotationGuideRef}
        x={centerX}
        y={centerY}
        radius={ROTATION_HANDLE_DISTANCE}
        stroke={AXIS_COLOR}
        strokeWidth={1}
        dash={[4, 4]}
        listening={false}
        visible={false}
      />

      <Group
        ref={rotationHandleRef}
        x={rotationHandlePosition.x}
        y={rotationHandlePosition.y}
        listening={false}
      >
        <Circle
          radius={ROTATION_HANDLE_RADIUS}
          fill={'#E5E5E5'}
          stroke={'#BFBFBF'}
          strokeWidth={1}
        />
        {tranImage && <Image image={tranImage} x={-4.5} y={-4.5} width={9} height={9} />}
      </Group>

      <Circle
        ref={rotationProxyRef}
        x={rotationHandlePosition.x}
        y={rotationHandlePosition.y}
        radius={ROTATION_HANDLE_HIT_RADIUS}
        fill={'rgba(0, 0, 0, 0.001)'}
        draggable
        onDragStart={handleRotationDragStart}
        onDragMove={handleRotationDragMove}
        onDragEnd={handleRotationDragEnd}
        onMouseEnter={(e) => enterCursor(e, 'grab')}
        onMouseLeave={leaveCursor}
      />

      <Circle
        x={centerX}
        y={centerY}
        radius={HANDLE_RADIUS}
        stroke={AXIS_COLOR}
        strokeWidth={1.5}
        fill={'white'}
        draggable
        onDragMove={handleCenterDragMove}
        onDragEnd={handleCenterDragEnd}
        onMouseEnter={(e) => enterCursor(e, 'move')}
        onMouseLeave={leaveCursor}
      />
    </Layer>
  );
};

export default React.memo(Symmetry);
