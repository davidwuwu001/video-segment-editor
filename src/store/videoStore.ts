import { create } from 'zustand';
import type { VideoState, SplitMarker } from '../types';
import { generateId, markersToSegments, generateDefaultName } from '../utils/segmentUtils';
import { storageService } from '../services/storageService';

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
    
    // 清除存储
    storageService.clearState();
  },

  setCurrentTime: (time: number) => set({ currentTime: time }),

  setDuration: (duration: number) => {
    set({ duration });
    // 初始化时创建一个覆盖整个视频的片段
    const { markers } = get();
    const segments = markersToSegments(markers, duration);
    set({ segments });
    
    // 保存状态
    const { videoFile } = get();
    if (videoFile) {
      storageService.saveState(videoFile, duration, markers, segments);
    }
  },

  setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),

  addMarker: (time: number) => {
    const { markers, duration, videoFile } = get();
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
    
    // 保存状态
    if (videoFile) {
      storageService.saveState(videoFile, duration, newMarkers, segments);
    }
  },

  updateMarker: (id: string, time: number) => {
    const { markers, duration, videoFile } = get();
    if (time <= 0 || time >= duration) {
      return;
    }

    const newMarkers = markers
      .map(m => (m.id === id ? { ...m, time } : m))
      .sort((a, b) => a.time - b.time);

    const segments = markersToSegments(newMarkers, duration);
    set({ markers: newMarkers, segments });
    
    // 保存状态
    if (videoFile) {
      storageService.saveState(videoFile, duration, newMarkers, segments);
    }
  },

  deleteMarker: (id: string) => {
    const { markers, duration, videoFile } = get();
    const newMarkers = markers.filter(m => m.id !== id);
    const segments = markersToSegments(newMarkers, duration);
    set({ markers: newMarkers, segments });
    
    // 保存状态
    if (videoFile) {
      storageService.saveState(videoFile, duration, newMarkers, segments);
    }
  },

  renameSegment: (id: string, name: string) => {
    const { segments, markers, duration, videoFile } = get();
    const newSegments = segments.map(s =>
      s.id === id ? { ...s, name: name || generateDefaultName(segments.indexOf(s)) } : s
    );
    set({ segments: newSegments });
    
    // 保存状态
    if (videoFile) {
      storageService.saveState(videoFile, duration, markers, newSegments);
    }
  },

  deleteSegment: (id: string) => {
    const { segments, markers, duration, videoFile } = get();
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
    
    // 保存状态
    if (videoFile) {
      storageService.saveState(videoFile, duration, newMarkers, newSegments);
    }
  },

  toggleSegmentSelected: (id: string) => {
    const { segments, markers, duration, videoFile } = get();
    const newSegments = segments.map(s =>
      s.id === id ? { ...s, selected: !s.selected } : s
    );
    set({ segments: newSegments });
    
    // 保存状态
    if (videoFile) {
      storageService.saveState(videoFile, duration, markers, newSegments);
    }
  },

  updateSegmentTime: (id: string, startTime: number, endTime: number) => {
    const { segments, markers, duration, videoFile } = get();
    
    // 验证时间范围
    if (startTime < 0 || endTime > duration || startTime >= endTime) {
      return false;
    }
    
    const segmentIndex = segments.findIndex(s => s.id === id);
    if (segmentIndex === -1) return false;
    
    // 检查是否与相邻片段冲突
    const prevSegment = segments[segmentIndex - 1];
    const nextSegment = segments[segmentIndex + 1];
    
    if (prevSegment && startTime < prevSegment.endTime) {
      return false;
    }
    if (nextSegment && endTime > nextSegment.startTime) {
      return false;
    }
    
    // 更新片段时间
    const newSegments = segments.map((s, i) => {
      if (s.id === id) {
        return { ...s, startTime, endTime };
      }
      // 更新相邻片段的边界
      if (i === segmentIndex - 1) {
        return { ...s, endTime: startTime };
      }
      if (i === segmentIndex + 1) {
        return { ...s, startTime: endTime };
      }
      return s;
    });
    
    // 重建 markers
    const newMarkers: SplitMarker[] = [];
    for (let i = 0; i < newSegments.length - 1; i++) {
      newMarkers.push({
        id: generateId(),
        time: newSegments[i].endTime,
      });
    }
    
    set({ segments: newSegments, markers: newMarkers });
    
    // 保存状态
    if (videoFile) {
      storageService.saveState(videoFile, duration, newMarkers, newSegments);
    }
    
    return true;
  },

  setExporting: (isExporting: boolean, progress = 0) =>
    set({ isExporting, exportProgress: progress }),
}));
