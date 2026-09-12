import type { FrontendToolDefinition } from '@zeroDraw/core';

export const getCanvasStateTool: FrontendToolDefinition = {
  name: 'get_canvas_state',
  async execute(_args, ctx) {
    const { layers } = ctx.getLayerState();
    return {
      projectId: ctx.projectId || null,
      layerCount: layers.length,
      layers: layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        order: layer.order,
      })),
    };
  },
};
