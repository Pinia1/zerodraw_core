import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GetProps } from 'antd';
import { List } from 'antd';
import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useLayerStore from '../../store/useLayer';
import BackgroundControl from './BackgroundControl';
import LayerItem from './LayerItem';

const SortableListItem: React.FC<GetProps<typeof List.Item> & { itemKey: string }> = (props) => {
  const { itemKey, style, children, ...rest } = props;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemKey,
  });

  const listStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Translate.toString(transform),
    transition,
    cursor: isDragging ? 'move' : 'default',
    borderBlockEnd: 'none',
    padding: '2px 0px',
    ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
  };

  return (
    <List.Item {...rest} ref={setNodeRef} style={listStyle}>
      <div style={{ width: '100%' }} {...attributes} {...listeners}>
        {children}
      </div>
    </List.Item>
  );
};

const DragList: React.FC = () => {
  const { layers, pushHistory } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
      pushHistory: state.pushHistory,
    }))
  );

  const reverseLayers = useMemo(() => {
    return [...layers].reverse();
  }, [layers]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // https://docs.dndkit.com/api-documentation/sensors/pointer#activation-constraints
        distance: 1,
      },
    })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!active || !over) {
      return;
    }
    if (active.id !== over.id) {
      const activeIndex = layers.findIndex((i) => i.id === active.id);
      const overIndex = layers.findIndex((i) => i.id === over.id);
      if (activeIndex === -1 || overIndex === -1) return;

      const activeOrder = layers[activeIndex].order;
      const overOrder = layers[overIndex].order;

      const nextLayers = layers.map((layer, idx) => {
        if (idx === activeIndex) return { ...layer, order: overOrder };
        if (idx === overIndex) return { ...layer, order: activeOrder };
        return layer;
      });

      pushHistory(nextLayers);
    }
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
        items={reverseLayers.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <List
          dataSource={reverseLayers}
          renderItem={(item) => (
            <SortableListItem key={item.id} itemKey={item.id}>
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
