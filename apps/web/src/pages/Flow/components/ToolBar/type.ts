import { ToolTypes } from '@zeroDraw/core';
export interface ToolBarProps {
  onFitView: (type: string) => void;
  setNodes: React.Dispatch<React.SetStateAction<AppNode[]>>;
}

export enum Actions {
  ADD = 'add',
  DIVIDER = 'divider',
  ROPE = 'rope',
  TEXT = 'text',
  UNDO = 'undo',
  REDO = 'redo',
  NOTE = 'note',
  SECTION = 'section',
}

export interface ToolMenus {
  key: Actions;
  icon?: React.ReactNode;
  type: ToolTypes;
  onClick?: (e?: any) => any;
  dropdown?: React.ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  tip?: string;
}
