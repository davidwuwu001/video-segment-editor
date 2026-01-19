// 切分标记
export interface SplitMarker {
  id: string;
  time: number; // 秒
}

// 视频片段
export interface Segment {
  id: string;
  name: string;
  startTime: number; // 秒
  endTime: number; // 秒
  selected: boolean; // 是否勾选保留
}

// 全局状态
export interface VideoState {
  // 视频文件
  videoFile: File | null;
  videoUrl: string | null;
  duration: number;

  // 播放状态
  currentTime: number;
  isPlaying: boolean;

  // 切分标记
  markers: SplitMarker[];

  // 片段列表
  segments: Segment[];

  // 导出状态
  isExporting: boolean;
  exportProgress: number;

  // Actions
  setVideoFile: (file: File) => void;
  clearVideo: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  addMarker: (time: number) => void;
  updateMarker: (id: string, time: number) => void;
  deleteMarker: (id: string) => void;
  renameSegment: (id: string, name: string) => void;
  deleteSegment: (id: string) => void;
  toggleSegmentSelected: (id: string) => void;
  updateSegmentTime: (id: string, startTime: number, endTime: number) => boolean;
  setExporting: (isExporting: boolean, progress?: number) => void;
}
