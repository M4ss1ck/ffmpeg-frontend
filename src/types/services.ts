// FFmpeg Service Types
export interface FFmpegInfo {
  path: string;
  version: string;
  buildDate: string;
  configuration: string[];
}

export interface Format {
  name: string;
  longName: string;
  extensions: string[];
  mimeTypes: string[];
  canDemux: boolean;
  canMux: boolean;
}

export interface Codec {
  name: string;
  longName: string;
  type: 'video' | 'audio' | 'subtitle';
  canEncode: boolean;
  canDecode: boolean;
}

export interface Filter {
  name: string;
  description: string;
  inputs: number;
  outputs: number;
  timeline: boolean;
  slice: boolean;
  command: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

// File Service Types
export interface MediaFileInfo {
  path: string;
  name: string;
  size: number;
  duration?: number;
  format: string;
  streams: StreamInfo[];
  metadata: Record<string, string>;
  thumbnail?: string;
}

export interface StreamInfo {
  index: number;
  type: 'video' | 'audio' | 'subtitle';
  codec: string;
  bitrate?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  sampleRate?: number;
  channels?: number;
  language?: string;
}

export interface FileSelectOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<
    'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles'
  >;
}

export interface OutputSelectOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo?: MediaFileInfo;
}

export interface FileSupportInfo {
  isSupported: boolean;
  fileType: 'video' | 'audio' | 'unknown';
}

export interface SupportedExtensions {
  video: string[];
  audio: string[];
}

// IPC Response Types
export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Drag and Drop Types
export interface DragDropFile {
  path: string;
  name: string;
  type: string;
  size: number;
}

export interface DragDropEvent {
  files: DragDropFile[];
  x: number;
  y: number;
}
