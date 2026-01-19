import type { SplitMarker, Segment } from '../types';

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * 生成默认片段名称
 * @param index 片段索引（从 0 开始）
 */
export function generateDefaultName(index: number): string {
  return `片段${index + 1}`;
}

/**
 * 计算片段时长
 * @param segment 片段
 * @returns 时长（秒）
 */
export function calculateDuration(segment: Segment): number {
  return segment.endTime - segment.startTime;
}

/**
 * 格式化时间为 MM:SS 或 HH:MM:SS
 * @param seconds 秒数
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * 解析时间字符串为秒数
 * 支持格式：MM:SS, HH:MM:SS, 或纯数字（秒）
 * @param timeStr 时间字符串
 * @returns 秒数，解析失败返回 null
 */
export function parseTime(timeStr: string): number | null {
  const trimmed = timeStr.trim();
  
  // 纯数字（秒）
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }
  
  // MM:SS 或 HH:MM:SS 格式
  const parts = trimmed.split(':').map(p => parseInt(p, 10));
  
  if (parts.some(isNaN)) {
    return null;
  }
  
  if (parts.length === 2) {
    // MM:SS
    const [m, s] = parts;
    if (m < 0 || s < 0 || s >= 60) return null;
    return m * 60 + s;
  }
  
  if (parts.length === 3) {
    // HH:MM:SS
    const [h, m, s] = parts;
    if (h < 0 || m < 0 || m >= 60 || s < 0 || s >= 60) return null;
    return h * 3600 + m * 60 + s;
  }
  
  return null;
}

/**
 * 将标记列表转换为片段列表
 * @param markers 标记列表
 * @param duration 视频总时长
 * @returns 片段列表
 */
export function markersToSegments(markers: SplitMarker[], duration: number): Segment[] {
  if (duration <= 0) {
    return [];
  }

  // 按时间排序标记
  const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);

  // 过滤掉超出范围的标记
  const validMarkers = sortedMarkers.filter(m => m.time > 0 && m.time < duration);

  // 构建时间点数组：[0, marker1, marker2, ..., duration]
  const timePoints = [0, ...validMarkers.map(m => m.time), duration];

  // 生成片段
  const segments: Segment[] = [];
  for (let i = 0; i < timePoints.length - 1; i++) {
    segments.push({
      id: generateId(),
      name: generateDefaultName(i),
      startTime: timePoints[i],
      endTime: timePoints[i + 1],
      selected: true, // 默认勾选
    });
  }

  return segments;
}

/**
 * 根据标记删除对应的片段
 * 删除标记后，相邻的两个片段会合并
 */
export function removeMarkerAndMergeSegments(
  segments: Segment[],
  markerTime: number
): Segment[] {
  // 找到以 markerTime 为边界的两个片段
  const leftIndex = segments.findIndex(s => Math.abs(s.endTime - markerTime) < 0.01);
  const rightIndex = segments.findIndex(s => Math.abs(s.startTime - markerTime) < 0.01);

  if (leftIndex === -1 || rightIndex === -1) {
    return segments;
  }

  const newSegments = [...segments];
  const leftSegment = newSegments[leftIndex];
  const rightSegment = newSegments[rightIndex];

  // 合并两个片段
  const mergedSegment: Segment = {
    id: leftSegment.id,
    name: leftSegment.name,
    startTime: leftSegment.startTime,
    endTime: rightSegment.endTime,
    selected: leftSegment.selected,
  };

  // 替换左边片段，删除右边片段
  newSegments[leftIndex] = mergedSegment;
  newSegments.splice(rightIndex, 1);

  return newSegments;
}
