import type {
  AssetListQuery,
  AssetListAllResult,
  ColorItem,
  CreateColorInput,
  UpdateColorInput,
} from '@zeroDraw/api-contract';
import request from '.';

export const httpGetAssetList = (
  params?: Partial<AssetListQuery>
): Promise<AssetListAllResult> => {
  return request.get('/api/assets/list', { params });
};

export const httpCreateAssetColor = (data: CreateColorInput): Promise<ColorItem> => {
  return request.post('/api/assets/colors', data);
};

export const httpUpdateAssetColor = (
  id: string,
  data: UpdateColorInput
): Promise<ColorItem> => {
  return request.put(`/api/assets/colors/${id}`, data);
};

export const httpDeleteAssetColor = (id: string): Promise<null> => {
  return request.delete(`/api/assets/colors/${id}`);
};
