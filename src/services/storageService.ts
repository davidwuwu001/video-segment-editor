/**
 * 本地存储服务
 * 只使用 localStorage 存储分段信息（不存储视频文件）
 */

const STORAGE_KEY = 'video-editor-state';

interface StoredState {
  fileName: string;
  fileSize: number;
  duration: number;
  markers: Array<{ id: string; time: number }>;
  segments: Array<{
    id: string;
    name: string;
    startTime: number;
    endTime: number;
    selected: boolean;
  }>;
  timestamp: number;
}

class StorageService {
  /**
   * 保存状态（只保存分段信息，不保存视频文件）
   */
  saveState(
    file: File,
    duration: number,
    markers: Array<{ id: string; time: number }>,
    segments: Array<{
      id: string;
      name: string;
      startTime: number;
      endTime: number;
      selected: boolean;
    }>
  ): void {
    try {
      const state: StoredState = {
        fileName: file.name,
        fileSize: file.size,
        duration,
        markers,
        segments,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('保存状态失败:', error);
    }
  }

  /**
   * 加载状态信息
   */
  loadState(): StoredState | null {
    try {
      const stateStr = localStorage.getItem(STORAGE_KEY);
      if (!stateStr) return null;
      return JSON.parse(stateStr);
    } catch (error) {
      console.error('加载状态失败:', error);
      return null;
    }
  }

  /**
   * 验证文件是否匹配保存的状态
   */
  isFileMatch(file: File): boolean {
    const state = this.loadState();
    if (!state) return false;
    return file.name === state.fileName && file.size === state.fileSize;
  }

  /**
   * 清除存储
   */
  clearState(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * 检查是否有保存的状态
   */
  hasStoredState(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  /**
   * 获取保存的文件名
   */
  getStoredFileName(): string | null {
    const state = this.loadState();
    return state?.fileName || null;
  }
}

export const storageService = new StorageService();
