import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GetProps } from 'antd';
import { List } from 'antd';
import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import useLayerStore from '../../store/useLayer';
import BackgroundControl from './BackgroundControl';
import LayerItem from './LayerItem';

const SortableListItem: React.FC<GetProps<typeof List.Item> & { itemKey: number }> = (props) => {
  const { itemKey, style, children, ...rest } = props;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemKey,
  });

  const listStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Translate.toString(transform),
    transition,
    cursor: isDragging ? 'move' : 'default',
    padding: 2,
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
  const { layers, setLayers } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
      setLayers: state.setLayers,
    }))
  );

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
      setLayers(arrayMove(layers, activeIndex, overIndex));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
      id="list-drag-sorting"
    >
      <SortableContext items={layers.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <List
          dataSource={layers}
          renderItem={(item) => (
            <SortableListItem key={item.id} itemKey={Number(item.id)}>
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
