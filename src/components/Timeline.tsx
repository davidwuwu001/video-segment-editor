import { useCallback, useRef, useState, useEffect } from 'react';
import { useVideoStore } from '../store/videoStore';
import { formatTime } from '../utils/segmentUtils';

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);

  const {
    duration,
    currentTime,
    markers,
    segments,
    zoomLevel,
    scrollOffset,
    setCurrentTime,
    addMarker,
    updateMarker,
    deleteMarker,
    setZoomLevel,
    setScrollOffset,
  } = useVideoStore();

  // 键盘方向键控制播放位置
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (duration <= 0) return;

      let newTime = currentTime;

      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        newTime = Math.max(0, currentTime - 5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        newTime = Math.min(duration, currentTime + 5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        newTime = Math.min(duration, currentTime + 30);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        newTime = Math.max(0, currentTime - 30);
      }

      if (newTime !== currentTime) {
        setCurrentTime(newTime);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, setCurrentTime]);

  // 鼠标滚轮缩放
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      
      const container = containerRef.current;
      const scrollContainer = scrollContainerRef.current;
      if (!container || !scrollContainer) return;

      // 获取鼠标在时间轴上的位置
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + scrollContainer.scrollLeft;
      const mouseTimePercent = mouseX / (rect.width * zoomLevel);
      const mouseTime = mouseTimePercent * duration;

      // 计算新的缩放级别
      const zoomDelta = e.deltaY > 0 ? -0.2 : 0.2;
      const newZoomLevel = Math.max(1, Math.min(20, zoomLevel + zoomDelta));

      // 计算新的滚动位置，使鼠标位置保持不变
      const newMouseX = mouseTimePercent * rect.width * newZoomLevel;
      const newScrollLeft = newMouseX - (e.clientX - rect.left);

      setZoomLevel(newZoomLevel);
      
      // 延迟设置滚动位置，等待 DOM 更新
      setTimeout(() => {
        if (scrollContainer) {
          scrollContainer.scrollLeft = newScrollLeft;
          setScrollOffset(newScrollLeft);
        }
      }, 0);
    },
    [duration, zoomLevel, setZoomLevel, setScrollOffset]
  );

  // 监听滚动事件
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollLeft = e.currentTarget.scrollLeft;
      setScrollOffset(scrollLeft);
    },
    [setScrollOffset]
  );

  // 计算位置百分比（相对于缩放后的宽度）
  const getPositionPercent = useCallback(
    (time: number) => {
      if (duration <= 0) return 0;
      return (time / duration) * 100;
    },
    [duration]
  );

  // 从鼠标位置计算时间
  const getTimeFromPosition = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      const scrollContainer = scrollContainerRef.current;
      if (!container || !scrollContainer || duration <= 0) return 0;

      const rect = container.getBoundingClientRect();
      const mouseX = clientX - rect.left + scrollContainer.scrollLeft;
      const percent = Math.max(0, Math.min(1, mouseX / (rect.width * zoomLevel)));
      return percent * duration;
    },
    [duration, zoomLevel]
  );

  // 点击时间轴跳转
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (draggingMarkerId) return;
      const time = getTimeFromPosition(e.clientX);
      setCurrentTime(time);
    },
    [getTimeFromPosition, setCurrentTime, draggingMarkerId]
  );

  // 双击添加标记
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const time = getTimeFromPosition(e.clientX);
      addMarker(time);
    },
    [getTimeFromPosition, addMarker]
  );

  // 开始拖动标记
  const handleMarkerMouseDown = useCallback(
    (e: React.MouseEvent, markerId: string) => {
      e.stopPropagation();
      setDraggingMarkerId(markerId);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const time = getTimeFromPosition(moveEvent.clientX);
        updateMarker(markerId, time);
      };

      const handleMouseUp = () => {
        setDraggingMarkerId(null);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [getTimeFromPosition, updateMarker]
  );

  // 删除标记
  const handleDeleteMarker = useCallback(
    (e: React.MouseEvent, markerId: string) => {
      e.stopPropagation();
      deleteMarker(markerId);
    },
    [deleteMarker]
  );

  // 拖动播放位置指示器
  const handlePlayheadMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const time = getTimeFromPosition(moveEvent.clientX);
        setCurrentTime(time);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [getTimeFromPosition, setCurrentTime]
  );

  // 生成时间刻度
  const generateTimeMarks = useCallback(() => {
    if (duration <= 0) return [];

    // 根据缩放级别自动调整刻度间隔
    let interval: number;
    if (zoomLevel >= 10) {
      interval = 0.1; // 0.1秒
    } else if (zoomLevel >= 5) {
      interval = 0.5; // 0.5秒
    } else if (zoomLevel >= 2) {
      interval = 1; // 1秒
    } else if (zoomLevel >= 1.5) {
      interval = 5; // 5秒
    } else {
      interval = 10; // 10秒
    }

    const marks: number[] = [];
    for (let time = 0; time <= duration; time += interval) {
      marks.push(time);
    }
    if (marks[marks.length - 1] !== duration) {
      marks.push(duration);
    }

    return marks;
  }, [duration, zoomLevel]);

  const timeMarks = generateTimeMarks();

  if (duration <= 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 缩放提示 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>缩放级别: {zoomLevel.toFixed(1)}x</span>
        <span>使用鼠标滚轮在时间轴上缩放</span>
      </div>

      {/* 时间轴容器 - 支持横向滚动 */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-hidden"
        onScroll={handleScroll}
        style={{ maxWidth: '100%' }}
      >
        <div
          ref={containerRef}
          className="relative h-16 bg-gray-200 rounded-lg cursor-pointer select-none"
          style={{ width: `${zoomLevel * 100}%`, minWidth: '100%' }}
          onClick={handleTimelineClick}
          onDoubleClick={handleDoubleClick}
          onWheel={handleWheel}
        >
          {/* 片段背景色 */}
          {segments.map((segment, index) => (
            <div
              key={segment.id}
              className={`absolute top-0 h-full ${
                !segment.selected
                  ? 'bg-gray-300 opacity-50'
                  : index % 2 === 0
                  ? 'bg-blue-100'
                  : 'bg-green-100'
              }`}
              style={{
                left: `${getPositionPercent(segment.startTime)}%`,
                width: `${getPositionPercent(segment.endTime - segment.startTime)}%`,
              }}
            >
              {!segment.selected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-gray-500 text-xs bg-white/70 px-1 rounded">已排除</span>
                </div>
              )}
            </div>
          ))}

          {/* 切分标记 */}
          {markers.map((marker) => (
            <div
              key={marker.id}
              className="absolute top-0 h-full w-1 bg-red-500 cursor-ew-resize group z-20"
              style={{ left: `${getPositionPercent(marker.time)}%` }}
              onMouseDown={(e) => handleMarkerMouseDown(e, marker.id)}
            >
              {/* 标记手柄 */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full" />
              {/* 删除按钮 */}
              <button
                className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-30"
                onClick={(e) => handleDeleteMarker(e, marker.id)}
              >
                ×
              </button>
              {/* 时间提示 */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
                {formatTime(marker.time)}
              </div>
            </div>
          ))}

          {/* 当前播放位置 - 可拖动 */}
          <div
            className="absolute top-0 h-full w-1 bg-blue-600 cursor-ew-resize z-30"
            style={{ left: `${getPositionPercent(currentTime)}%` }}
            onMouseDown={handlePlayheadMouseDown}
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-600 rotate-45 cursor-ew-resize" />
          </div>
        </div>
      </div>

      {/* 时间刻度 - 根据缩放级别动态生成 */}
      <div
        className="overflow-x-auto overflow-y-hidden"
        style={{ maxWidth: '100%' }}
      >
        <div
          className="relative text-xs text-gray-500"
          style={{ width: `${zoomLevel * 100}%`, minWidth: '100%', height: '20px' }}
        >
          {timeMarks.map((time, index) => (
            <div
              key={index}
              className="absolute whitespace-nowrap"
              style={{ left: `${getPositionPercent(time)}%` }}
            >
              {formatTime(time)}
            </div>
          ))}
        </div>
      </div>

      {/* 提示 */}
      <p className="text-xs text-gray-400 text-center">
        双击时间轴添加标记 | 拖动标记调整位置 | 点击跳转播放位置 | 鼠标滚轮缩放 | ← → 快进/快退5秒 | ↑ ↓ 快进/快退30秒
      </p>
    </div>
  );
}
