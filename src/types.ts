export interface EditorState {
  filePath: string;
  viewColumn: number;
  isActive: boolean;
  isPinned: boolean;
  cursorLine: number;
  cursorCharacter: number;
  scrollTop: number;
  selections: SerializedSelection[];
}

export interface SerializedSelection {
  anchorLine: number;
  anchorCharacter: number;
  activeLine: number;
  activeCharacter: number;
}

export interface EditorGroupState {
  viewColumn: number;
  editors: EditorState[];
}

export interface BranchState {
  branch: string;
  timestamp: number;
  groups: EditorGroupState[];
  activeGroupIndex: number;
}

export interface StateStore {
  [branch: string]: BranchState;
}
