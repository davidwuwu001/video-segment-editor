import { useCallback, useState, useEffect } from 'react';
import { useVideoStore } from '../store/videoStore';
import { isValidVideoFormat, getSupportedFormats } from '../utils/fileValidation';
import { storageService } from '../services/storageService';

export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storedFileName, setStoredFileName] = useState<string | null>(null);
  const setVideoFile = useVideoStore((state) => state.setVideoFile);

  // 检查是否有保存的状态
  useEffect(() => {
    if (storageService.hasStoredState()) {
      setStoredFileName(storageService.getStoredFileName());
    }
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (!isValidVideoFormat(file.name)) {
        setError(`不支持的格式。支持的格式: ${getSupportedFormats().join(', ')}`);
        return;
      }
      
      // 检查是否匹配保存的状态
      if (storageService.isFileMatch(file)) {
        const state = storageService.loadState();
        if (state) {
          setVideoFile(file);
          // 延迟恢复分段信息
          setTimeout(() => {
            useVideoStore.setState({
              duration: state.duration,
              markers: state.markers,
              segments: state.segments,
            });
          }, 200);
          return;
        }
      }
      
      // 新文件，清除旧的存储
      storageService.clearState();
      setVideoFile(file);
    },
    [setVideoFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = getSupportedFormats().join(',');
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFile(file);
      }
    };
    input.click();
  }, [handleFile]);

  return (
    <div
      className={`
        flex flex-col items-center justify-center
        w-full h-64 border-2 border-dashed rounded-lg
        cursor-pointer transition-colors
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <svg
        className="w-12 h-12 text-gray-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <p className="text-gray-600 mb-2">拖拽视频文件到这里，或点击选择</p>
      <p className="text-gray-400 text-sm">支持 MP4, MOV, AVI, MKV 格式</p>
      {storedFileName && (
        <p className="text-blue-500 mt-2 text-sm">
          💡 检测到上次编辑的视频：{storedFileName}，重新选择该文件可恢复分段
        </p>
      )}
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
}
