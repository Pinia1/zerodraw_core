import { eq, projectLayer } from '@zeroDraw/db';
import { db } from '../../db';
import type { SaveLayerInput } from '@zeroDraw/api-contract';

class ProjectLayerRepository {
  async findByProjectId(projectId: string) {
    return db
      .select()
      .from(projectLayer)
      .where(eq(projectLayer.projectId, projectId))
      .orderBy(projectLayer.order);
  }

  async deleteByProjectId(projectId: string) {
    await db.delete(projectLayer).where(eq(projectLayer.projectId, projectId));
  }

  async bulkInsert(projectId: string, layers: SaveLayerInput[]) {
    if (layers.length === 0) return;
    await db.insert(projectLayer).values(
      layers.map((l) => ({
        id: l.id,
        projectId,
        name: l.name,
        order: l.order,
        opacity: l.opacity,
        visible: l.visible,
        blendMode: l.blendMode,
        filter: l.filter ?? null,
        content: l.content,
      }))
    );
  }
}

export const projectLayerRepository = new ProjectLayerRepository();
