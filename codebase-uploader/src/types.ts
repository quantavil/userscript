export interface Settings {
  maxChunks: number;
  maxFileBytes: number;
  maxChunkChars: number;
  ignoreFolders: string;
  ignoreExts: string;
  skipHidden: boolean;
  includeBinary: boolean;
  customPrompt: string;
  shortcutKey: string;
}

export interface FileObj {
  file: File;
  path: string;
  selected: boolean;
  isBinary: boolean;
}

export interface FolderNode {
  isFolder: true;
  name: string;
  path: string;
  children: Map<string, TreeNode>;
}

export interface FileNode {
  isFolder: false;
  name: string;
  path: string;
  item: FileObj;
}

export type TreeNode = FolderNode | FileNode;
export type DroppedFile = { file: File; path: string };
