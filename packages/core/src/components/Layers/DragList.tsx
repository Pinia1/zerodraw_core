import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GetProps } from 'antd';
import { List } from 'antd';
import React, { useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useLayerStore from '../../store/useLayer';
import { isMobile } from '../../utils/platform';
import BackgroundControl from './BackgroundControl';
import LayerItem from './LayerItem';

const HANDLE_W = 44;
const SWIPE_OPEN_THRESHOLD = 18;
const SWIPE_CLOSE_THRESHOLD = 12;

const SortableListItem: React.FC<
  GetProps<typeof List.Item> & {
    itemKey: string;
    mobileSwipeEnabled: boolean;
    panelScale: number;
    isOpen: boolean;
    onOpen: (id: string) => void;
    onClose: () => void;
  }
> = (props) => {
  const {
    itemKey,
    style,
    children,
    mobileSwipeEnabled,
    panelScale,
    isOpen,
    onOpen,
    onClose,
    ...rest
  } = props;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemKey,
  });

  const touchRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    decided: boolean;
    horizontal: boolean;
  } | null>(null);

  const listStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Translate.toString(
      transform
        ? {
            ...transform,
            x: transform.x / Math.max(0.001, panelScale || 1),
            y: transform.y / Math.max(0.001, panelScale || 1),
          }
        : null
    ),
    transition,
    cursor: isDragging ? 'move' : 'default',
    borderBlockEnd: 'none',
    padding: '2px 0px',
    ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
  };

  return (
    <List.Item {...rest} ref={setNodeRef} style={listStyle}>
      <div style={{ width: '100%', position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
        {mobileSwipeEnabled ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: HANDLE_W,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: isOpen ? 'auto' : 'none',
            }}
          >
            <div
              {...attributes}
              {...listeners}
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                cursor: 'grab',
                borderRadius: 8,
                color: 'rgba(0,0,0,0.45)',
                background: 'rgba(0,0,0,0.06)',
                lineHeight: 1,
                fontWeight: 700,
              }}
              aria-label="Drag handle"
            >
              ⋮⋮
            </div>
          </div>
        ) : null}

        <div
          style={{
            width: '100%',
            transform:
              mobileSwipeEnabled && isOpen ? `translateX(${HANDLE_W}px)` : 'translateX(0px)',
            transition: isDragging ? 'none' : 'transform 160ms ease',
            touchAction: mobileSwipeEnabled ? 'pan-y' : 'auto',
          }}
          onTouchStart={(e) => {
            if (!mobileSwipeEnabled) return;
            if (isDragging) return;
            const t = e.touches[0];
            touchRef.current = {
              startX: t.clientX,
              startY: t.clientY,
              lastX: t.clientX,
              lastY: t.clientY,
              decided: false,
              horizontal: false,
            };
          }}
          onTouchMove={(e) => {
            if (!mobileSwipeEnabled) return;
            const s = touchRef.current;
            if (!s || isDragging) return;
            const t = e.touches[0];
            s.lastX = t.clientX;
            s.lastY = t.clientY;

            const dx = t.clientX - s.startX;
            const dy = t.clientY - s.startY;

            if (!s.decided) {
              if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                s.horizontal = true;
                s.decided = true;
              } else if (Math.abs(dy) > 10) {
                s.decided = true;
              }
            }

            if (s.horizontal) {
              e.preventDefault();
            }
          }}
          onTouchEnd={() => {
            if (!mobileSwipeEnabled) return;
            const s = touchRef.current;
            touchRef.current = null;
            if (!s || !s.horizontal) return;

            const dx = s.lastX - s.startX;

            if (!isOpen && dx > SWIPE_OPEN_THRESHOLD) {
              onOpen(itemKey);
              return;
            }
            if (isOpen && dx < -SWIPE_CLOSE_THRESHOLD) {
              onClose();
            }
          }}
          // Desktop：整行可拖拽
          {...(!mobileSwipeEnabled ? attributes : {})}
          {...(!mobileSwipeEnabled ? listeners : {})}
        >
          {children}
        </div>
      </div>
    </List.Item>
  );
};

const DragList: React.FC<{ panelScale?: number }> = ({ panelScale = 1 }) => {
  const { layers, pushHistory, setDrawingLayer } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
      pushHistory: state.pushHistory,
      setDrawingLayer: state.setDrawingLayer,
    }))
  );

  const sortList = useMemo(() => {
    return layers.slice().sort((a, b) => b.order - a.order);
  }, [layers]);

  const [openId, setOpenId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // https://docs.dndkit.com/api-documentation/sensors/pointer#activation-constraints
        distance: 1,
      },
    })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!active || !over) return;
    if (active.id === over.id) return;

    const oldIndex = sortList.findIndex((i) => i.id === active.id);
    const newIndex = sortList.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const moved = arrayMove(sortList, oldIndex, newIndex);

    const maxOrder = Math.max(...layers.map((l) => l.order), 0);
    const nextLayers = layers.map((l) => l);
    const orderBase = maxOrder + moved.length;

    const idToOrder = new Map<string, number>();
    moved.forEach((l, idx) => {
      idToOrder.set(l.id, orderBase - idx);
    });

    const updated = nextLayers.map((l) =>
      idToOrder.has(l.id) ? { ...l, order: idToOrder.get(l.id)! } : l
    );

    pushHistory(updated);
    setDrawingLayer(updated[updated.length - 1]);
  };

  return (
    <DndContext
      sensors={sensors}
      // modifiers={[restrictToVerticalAxis]}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
      id="list-drag-sorting"
    >
      <SortableContext
        items={sortList.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <List
          dataSource={sortList}
          renderItem={(item) => (
            <SortableListItem
              key={item.id}
              itemKey={item.id}
              mobileSwipeEnabled={isMobile}
              panelScale={panelScale}
              isOpen={openId === item.id}
              onOpen={(id) => setOpenId(id)}
              onClose={() => setOpenId(null)}
            >
              <LayerItem {...item} />
            </SortableListItem>
          )}
        />
      </SortableContext>
      <BackgroundControl />
    </DndContext>
  );
};

export default React.memo(DragList);
