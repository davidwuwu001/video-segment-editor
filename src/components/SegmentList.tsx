import { useState, useCallback } from 'react';
import { useVideoStore } from '../store/videoStore';
import { formatTime, calculateDuration, parseTime } from '../utils/segmentUtils';
import type { Segment } from '../types';

interface SegmentListProps {
  onExportSingle: (segment: Segment) => void;
  onExportAll: () => void;
  onExportMerged: () => void;
}

export function SegmentList({ onExportSingle, onExportAll, onExportMerged }: SegmentListProps) {
  const { segments, renameSegment, deleteSegment, toggleSegmentSelected, setCurrentTime, isExporting, exportProgress, updateSegmentTime, duration } =
    useVideoStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editingTimeType, setEditingTimeType] = useState<'start' | 'end' | null>(null);
  const [editingTimeValue, setEditingTimeValue] = useState('');
  const [showWindowCountModal, setShowWindowCountModal] = useState(false);
  const [remainingWindows, setRemainingWindows] = useState(0);

  const selectedCount = segments.filter(s => s.selected).length;

  const handleStartEdit = useCallback((segment: Segment) => {
    setEditingId(segment.id);
    setEditingName(segment.name);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingId) {
      renameSegment(editingId, editingName);
      setEditingId(null);
    }
  }, [editingId, editingName, renameSegment]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingName('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveEdit();
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (segments.length <= 1) {
        alert('至少保留一个片段');
        return;
      }
      if (confirm('确定删除这个片段吗？')) {
        deleteSegment(id);
      }
    },
    [deleteSegment, segments.length]
  );

  const handlePreview = useCallback(
    (segment: Segment) => {
      setCurrentTime(segment.startTime);
    },
    [setCurrentTime]
  );

  // 开始编辑时间
  const handleStartEditTime = useCallback((segment: Segment, type: 'start' | 'end') => {
    setEditingTimeId(segment.id);
    setEditingTimeType(type);
    setEditingTimeValue(formatTime(type === 'start' ? segment.startTime : segment.endTime));
  }, []);

  // 保存时间编辑
  const handleSaveTimeEdit = useCallback(() => {
    if (!editingTimeId || !editingTimeType) return;
    
    const segment = segments.find(s => s.id === editingTimeId);
    if (!segment) return;
    
    const newTime = parseTime(editingTimeValue);
    if (newTime === null) {
      alert('时间格式无效，请使用 MM:SS 或 HH:MM:SS 格式');
      return;
    }
    
    // 验证时间范围
    if (newTime < 0 || newTime > duration) {
      alert(`时间必须在 00:00 到 ${formatTime(duration)} 之间`);
      return;
    }
    
    const newStartTime = editingTimeType === 'start' ? newTime : segment.startTime;
    const newEndTime = editingTimeType === 'end' ? newTime : segment.endTime;
    
    if (newStartTime >= newEndTime) {
      alert('开始时间必须小于结束时间');
      return;
    }
    
    const success = updateSegmentTime(editingTimeId, newStartTime, newEndTime);
    if (!success) {
      alert('时间设置无效，可能与相邻片段冲突');
    }
    
    setEditingTimeId(null);
    setEditingTimeType(null);
    setEditingTimeValue('');
  }, [editingTimeId, editingTimeType, editingTimeValue, segments, duration, updateSegmentTime]);

  // 取消时间编辑
  const handleCancelTimeEdit = useCallback(() => {
    setEditingTimeId(null);
    setEditingTimeType(null);
    setEditingTimeValue('');
  }, []);

  // 时间编辑键盘事件
  const handleTimeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveTimeEdit();
      } else if (e.key === 'Escape') {
        handleCancelTimeEdit();
      }
    },
    [handleSaveTimeEdit, handleCancelTimeEdit]
  );

    const handleOpenYouzan = useCallback((count: number) => {
      const url = 'https://www.youzan.com/v4/vis/pct/page/content#/add/video';
      window.open(url, '_blank');
      
      if (count > 1) {
        setRemainingWindows(count - 1);
      } else {
        setShowWindowCountModal(false);
      }
    }, []);

  const handleOpenNextWindow = useCallback(() => {
    const url = 'https://www.youzan.com/v4/vis/pct/page/content#/add/video';
    window.open(url, '_blank');
    
    if (remainingWindows > 1) {
      setRemainingWindows(remainingWindows - 1);
    } else {
      setRemainingWindows(0);
      setShowWindowCountModal(false);
    }
  }, [remainingWindows]);

  if (segments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 标题和导出按钮 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          片段列表 ({selectedCount}/{segments.length} 已选)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onExportAll}
            disabled={isExporting || selectedCount === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
          >
            分别导出
          </button>
          <button
            onClick={onExportMerged}
            disabled={isExporting || selectedCount === 0}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 transition-colors"
          >
            合并导出
          </button>
          <button
            onClick={() => setShowWindowCountModal(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            打开有赞
          </button>
        </div>
      </div>

      {/* 导出进度 */}
      {isExporting && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${exportProgress}%` }}
          />
        </div>
      )}

      {/* 片段列表 */}
      <div className="flex flex-col gap-2">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className={`flex items-center gap-4 p-3 rounded-lg border ${
              !segment.selected
                ? 'bg-gray-100 border-gray-300 opacity-60'
                : index % 2 === 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-green-50 border-green-200'
            }`}
          >
            {/* 勾选框 */}
            <input
              type="checkbox"
              checked={segment.selected}
              onChange={() => toggleSegmentSelected(segment.id)}
              className="w-5 h-5 text-blue-600 rounded cursor-pointer"
            />

            {/* 序号 */}
            <span className="text-gray-500 font-mono w-6">{index + 1}</span>

            {/* 名称（可编辑） */}
            {editingId === segment.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1 px-2 py-1 border rounded"
              />
            ) : (
              <span
                className="flex-1 cursor-pointer hover:text-blue-600"
                onClick={() => handleStartEdit(segment)}
                title="点击编辑名称"
              >
                {segment.name}
              </span>
            )}

            {/* 时间信息（可编辑） */}
            <span className="text-sm text-gray-500 font-mono flex items-center gap-1">
              {editingTimeId === segment.id && editingTimeType === 'start' ? (
                <input
                  type="text"
                  value={editingTimeValue}
                  onChange={(e) => setEditingTimeValue(e.target.value)}
                  onBlur={handleSaveTimeEdit}
                  onKeyDown={handleTimeKeyDown}
                  autoFocus
                  className="w-20 px-1 py-0.5 border rounded text-center text-sm"
                  placeholder="00:00"
                />
              ) : (
                <span
                  className="cursor-pointer hover:text-blue-600 hover:bg-blue-50 px-1 rounded"
                  onClick={() => handleStartEditTime(segment, 'start')}
                  title="点击编辑开始时间"
                >
                  {formatTime(segment.startTime)}
                </span>
              )}
              <span>-</span>
              {editingTimeId === segment.id && editingTimeType === 'end' ? (
                <input
                  type="text"
                  value={editingTimeValue}
                  onChange={(e) => setEditingTimeValue(e.target.value)}
                  onBlur={handleSaveTimeEdit}
                  onKeyDown={handleTimeKeyDown}
                  autoFocus
                  className="w-20 px-1 py-0.5 border rounded text-center text-sm"
                  placeholder="00:00"
                />
              ) : (
                <span
                  className="cursor-pointer hover:text-blue-600 hover:bg-blue-50 px-1 rounded"
                  onClick={() => handleStartEditTime(segment, 'end')}
                  title="点击编辑结束时间"
                >
                  {formatTime(segment.endTime)}
                </span>
              )}
            </span>
            <span className="text-sm text-gray-400 w-16">
              ({formatTime(calculateDuration(segment))})
            </span>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePreview(segment)}
                className="p-1 text-blue-500 hover:text-blue-700"
                title="预览"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              <button
                onClick={() => onExportSingle(segment)}
                disabled={isExporting}
                className="p-1 text-green-500 hover:text-green-700 disabled:text-gray-400"
                title="导出此片段"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
              <button
                onClick={() => handleDelete(segment.id)}
                disabled={segments.length <= 1}
                className="p-1 text-red-500 hover:text-red-700 disabled:text-gray-400"
                title="删除"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 窗口数量选择弹窗 */}
      {showWindowCountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl min-w-[300px]">
            {remainingWindows === 0 ? (
              <>
                <h3 className="text-lg font-semibold mb-4">选择打开窗口数量</h3>
                <div className="flex gap-2 flex-wrap justify-center">
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((count) => (
                    <button
                      key={count}
                      onClick={() => handleOpenYouzan(count)}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors min-w-[60px]"
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-4 text-center">
                  还需打开 {remainingWindows} 个窗口
                </h3>
                <button
                  onClick={handleOpenNextWindow}
                  className="w-full px-6 py-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-lg font-semibold"
                >
                  点击打开下一个窗口
                </button>
              </>
            )}
            <button
              onClick={() => {
                setShowWindowCountModal(false);
                setRemainingWindows(0);
              }}
              className="mt-4 w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              {remainingWindows > 0 ? '完成' : '取消'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
