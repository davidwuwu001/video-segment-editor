import { useCallback, useEffect, useState } from 'react';
import { DropZone } from './components/DropZone';
import { VideoPreview } from './components/VideoPreview';
import { Timeline } from './components/Timeline';
import { SegmentList } from './components/SegmentList';
import { useVideoStore } from './store/videoStore';
import { ffmpegService } from './services/ffmpegService';
import { downloadBlob, generateExportFilename } from './utils/exportUtils';
import { getFileExtension } from './utils/fileValidation';
import type { Segment } from './types';

function App() {
  const { videoFile, videoUrl, segments, setExporting, clearVideo } = useVideoStore();
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [showMergeNameModal, setShowMergeNameModal] = useState(false);
  const [mergeFileName, setMergeFileName] = useState('');

  // 预加载 FFmpeg
  useEffect(() => {
    if (videoUrl && !ffmpegLoaded && !ffmpegLoading) {
      setFfmpegLoading(true);
      ffmpegService
        .load()
        .then(() => {
          setFfmpegLoaded(true);
        })
        .catch((err) => {
          console.error('FFmpeg 加载失败:', err);
        })
        .finally(() => {
          setFfmpegLoading(false);
        });
    }
  }, [videoUrl, ffmpegLoaded, ffmpegLoading]);

  // 导出单个片段
  const handleExportSingle = useCallback(
    async (segment: Segment) => {
      if (!videoFile) return;

      try {
        setExporting(true, 0);
        const blob = await ffmpegService.cutSegment(
          videoFile,
          segment.startTime,
          segment.endTime,
          segment.name,
          (progress) => setExporting(true, progress)
        );
        const ext = getFileExtension(videoFile.name);
        const filename = generateExportFilename(segment.name, ext);
        downloadBlob(blob, filename);
      } catch (err) {
        console.error('导出失败:', err);
        alert('导出失败，请重试');
      } finally {
        setExporting(false);
      }
    },
    [videoFile, setExporting]
  );

  // 分别导出所有勾选的片段
  const handleExportAll = useCallback(async () => {
    if (!videoFile || segments.length === 0) return;

    const selectedSegments = segments.filter(s => s.selected);
    if (selectedSegments.length === 0) {
      alert('请至少勾选一个片段');
      return;
    }

    try {
      setExporting(true, 0);
      const ext = getFileExtension(videoFile.name);

      for (let i = 0; i < selectedSegments.length; i++) {
        const segment = selectedSegments[i];
        const progress = (i / selectedSegments.length) * 100;
        setExporting(true, progress);

        const blob = await ffmpegService.cutSegment(
          videoFile,
          segment.startTime,
          segment.endTime,
          segment.name
        );
        const filename = generateExportFilename(segment.name, ext);
        downloadBlob(blob, filename);

        // 稍微延迟，避免浏览器阻止多次下载
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  }, [videoFile, segments, setExporting]);

  // 合并导出勾选的片段 - 显示命名弹窗
  const handleExportMerged = useCallback(() => {
    if (!videoFile || segments.length === 0) return;

    const selectedSegments = segments.filter(s => s.selected);
    if (selectedSegments.length === 0) {
      alert('请至少勾选一个片段');
      return;
    }

    // 默认文件名：原文件名_merged
    const originalName = videoFile.name.replace(/\.[^.]+$/, '');
    setMergeFileName(originalName + '_merged');
    setShowMergeNameModal(true);
  }, [videoFile, segments]);

  // 确认合并导出
  const handleConfirmMerge = useCallback(async () => {
    if (!videoFile || !mergeFileName.trim()) return;

    const selectedSegments = segments.filter(s => s.selected);
    setShowMergeNameModal(false);

    try {
      setExporting(true, 0);
      const ext = getFileExtension(videoFile.name);
      const { blob } = await ffmpegService.mergeSegments(
        videoFile,
        selectedSegments,
        (progress) => setExporting(true, progress)
      );
      const filename = generateExportFilename(mergeFileName.trim(), ext);
      downloadBlob(blob, filename);
    } catch (err) {
      console.error('合并导出失败:', err);
      alert('合并导出失败，请重试');
    } finally {
      setExporting(false);
    }
  }, [videoFile, segments, mergeFileName, setExporting]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 头部 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">视频分段剪辑器</h1>
          {videoUrl && (
            <button
              onClick={clearVideo}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg hover:bg-gray-50"
            >
              重新选择视频
            </button>
          )}
        </div>
      </header>

      {/* 主内容 */}
      <main className={videoUrl ? 'px-4 py-4' : 'max-w-6xl mx-auto px-4 py-8'}>
        {!videoUrl ? (
          // 上传区域
          <DropZone />
        ) : (
          // 编辑区域 - 全屏宽度
          <div className="flex flex-col gap-4">
            {/* FFmpeg 加载状态 */}
            {ffmpegLoading && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                正在加载视频处理引擎，请稍候...
              </div>
            )}

            {/* 视频预览 - 全宽 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <VideoPreview />
            </div>

            {/* 时间轴 - 全宽 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <Timeline />
            </div>

            {/* 片段列表 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <SegmentList
                onExportSingle={handleExportSingle}
                onExportAll={handleExportAll}
                onExportMerged={handleExportMerged}
              />
            </div>
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="text-center py-4 text-gray-400 text-sm">
        视频处理完全在浏览器中进行，不会上传到服务器
      </footer>

      {/* 合并导出命名弹窗 */}
      {showMergeNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl min-w-[400px]">
            <h3 className="text-lg font-semibold mb-4">输入导出文件名</h3>
            <input
              type="text"
              value={mergeFileName}
              onChange={(e) => setMergeFileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmMerge()}
              autoFocus
              className="w-full px-4 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="请输入文件名"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowMergeNameModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmMerge}
                disabled={!mergeFileName.trim()}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 transition-colors"
              >
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
