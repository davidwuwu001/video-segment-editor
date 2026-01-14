import { useRef, useEffect, useCallback } from 'react';
import { useVideoStore } from '../store/videoStore';
import { formatTime } from '../utils/segmentUtils';

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    videoUrl,
    currentTime,
    isPlaying,
    duration,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    addMarker,
  } = useVideoStore();

  // 同步播放状态
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, setIsPlaying]);

  // 同步 store 中的 currentTime 到视频元素
  useEffect(() => {
    const video = videoRef.current;
    if (video && Math.abs(video.currentTime - currentTime) > 0.1) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  }, [setCurrentTime]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  }, [setDuration]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    },
    [setCurrentTime]
  );

  const togglePlay = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const handleAddMarker = useCallback(() => {
    addMarker(currentTime);
  }, [addMarker, currentTime]);

  if (!videoUrl) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 视频播放器 */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full max-h-[400px] object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      </div>

      {/* 控制栏 */}
      <div className="flex items-center gap-4">
        {/* 播放/暂停按钮 */}
        <button
          onClick={togglePlay}
          className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* 时间显示 */}
        <span className="text-sm text-gray-600 min-w-[100px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* 进度条 */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />

        {/* 添加标记按钮 */}
        <button
          onClick={handleAddMarker}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          添加标记
        </button>
      </div>
    </div>
  );
}
