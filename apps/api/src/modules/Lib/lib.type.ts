import { PaginationQuery } from '@zeroDraw/api-contract';

export interface GetOutputsParams extends PaginationQuery {
  userId: number;
}
