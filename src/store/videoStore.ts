import { create } from 'zustand';
import type { VideoState, SplitMarker } from '../types';
import { generateId, markersToSegments, generateDefaultName } from '../utils/segmentUtils';

export const useVideoStore = create<VideoState>((set, get) => ({
  // 视频文件
  videoFile: null,
  videoUrl: null,
  duration: 0,

  // 播放状态
  currentTime: 0,
  isPlaying: false,

  // 切分标记
  markers: [],

  // 片段列表
  segments: [],

  // 导出状态
  isExporting: false,
  exportProgress: 0,

  // Actions
  setVideoFile: (file: File) => {
    const { videoUrl } = get();
    // 释放之前的 URL
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    const url = URL.createObjectURL(file);
    set({
      videoFile: file,
      videoUrl: url,
      duration: 0,
      currentTime: 0,
      isPlaying: false,
      markers: [],
      segments: [],
    });
  },

  clearVideo: () => {
    const { videoUrl } = get();
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    set({
      videoFile: null,
      videoUrl: null,
      duration: 0,
      currentTime: 0,
      isPlaying: false,
      markers: [],
      segments: [],
    });
  },

  setCurrentTime: (time: number) => set({ currentTime: time }),

  setDuration: (duration: number) => {
    set({ duration });
    // 初始化时创建一个覆盖整个视频的片段
    const { markers } = get();
    const segments = markersToSegments(markers, duration);
    set({ segments });
  },

  setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),

  addMarker: (time: number) => {
    const { markers, duration } = get();
    // 检查是否已存在相近的标记（0.1秒内）
    const exists = markers.some(m => Math.abs(m.time - time) < 0.1);
    if (exists || time <= 0 || time >= duration) {
      return;
    }

    const newMarker: SplitMarker = {
      id: generateId(),
      time,
    };

    const newMarkers = [...markers, newMarker].sort((a, b) => a.time - b.time);
    const segments = markersToSegments(newMarkers, duration);

    set({ markers: newMarkers, segments });
  },

  updateMarker: (id: string, time: number) => {
    const { markers, duration } = get();
    if (time <= 0 || time >= duration) {
      return;
    }

    const newMarkers = markers
      .map(m => (m.id === id ? { ...m, time } : m))
      .sort((a, b) => a.time - b.time);

    const segments = markersToSegments(newMarkers, duration);
    set({ markers: newMarkers, segments });
  },

  deleteMarker: (id: string) => {
    const { markers, duration } = get();
    const newMarkers = markers.filter(m => m.id !== id);
    const segments = markersToSegments(newMarkers, duration);
    set({ markers: newMarkers, segments });
  },

  renameSegment: (id: string, name: string) => {
    const { segments } = get();
    const newSegments = segments.map(s =>
      s.id === id ? { ...s, name: name || generateDefaultName(segments.indexOf(s)) } : s
    );
    set({ segments: newSegments });
  },

  deleteSegment: (id: string) => {
    const { segments, markers, duration } = get();
    const segmentToDelete = segments.find(s => s.id === id);
    if (!segmentToDelete || segments.length <= 1) {
      return; // 不能删除最后一个片段
    }

    // 找到需要删除的标记（片段的起始或结束边界）
    const markerTimesToRemove: number[] = [];

    // 如果不是第一个片段，删除其起始边界的标记
    if (segmentToDelete.startTime > 0) {
      markerTimesToRemove.push(segmentToDelete.startTime);
    }
    // 如果不是最后一个片段，删除其结束边界的标记
    if (segmentToDelete.endTime < duration) {
      markerTimesToRemove.push(segmentToDelete.endTime);
    }

    // 删除对应的标记
    const newMarkers = markers.filter(
      m => !markerTimesToRemove.some(t => Math.abs(m.time - t) < 0.01)
    );

    const newSegments = markersToSegments(newMarkers, duration);
    set({ markers: newMarkers, segments: newSegments });
  },

  toggleSegmentSelected: (id: string) => {
    const { segments } = get();
    const newSegments = segments.map(s =>
      s.id === id ? { ...s, selected: !s.selected } : s
    );
    set({ segments: newSegments });
  },

  setExporting: (isExporting: boolean, progress = 0) =>
    set({ isExporting, exportProgress: progress }),
}));
