import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { Segment } from '../types';
import { generateExportFilename, generateMergedFilename } from '../utils/exportUtils';
import { getFileExtension } from '../utils/fileValidation';

class FFmpegService {
  private ffmpeg: FFmpeg;
  private loaded = false;
  private loading = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  async load(onProgress?: (progress: number) => void): Promise<void> {
    if (this.loaded) return;
    if (this.loading) {
      // 等待加载完成
      while (this.loading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    this.loading = true;

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress?.(progress * 100);
      });

      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.loaded = true;
    } finally {
      this.loading = false;
    }
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * 切分单个片段
   */
  async cutSegment(
    file: File,
    startTime: number,
    endTime: number,
    outputName: string,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.loaded) {
      await this.load();
    }

    const ext = getFileExtension(file.name) || '.mp4';
    const inputFileName = `input${ext}`;
    const outputFileName = generateExportFilename(outputName, ext);

    // 写入输入文件
    await this.ffmpeg.writeFile(inputFileName, await fetchFile(file));

    // 设置进度回调
    this.ffmpeg.on('progress', ({ progress }) => {
      onProgress?.(progress * 100);
    });

    // 执行切分命令
    await this.ffmpeg.exec([
      '-i',
      inputFileName,
      '-ss',
      startTime.toString(),
      '-to',
      endTime.toString(),
      '-c',
      'copy', // 无损复制
      outputFileName,
    ]);

    // 读取输出文件
    const data = await this.ffmpeg.readFile(outputFileName);
    const uint8Array = data as Uint8Array;

    // 清理文件
    await this.ffmpeg.deleteFile(inputFileName);
    await this.ffmpeg.deleteFile(outputFileName);

    return new Blob([uint8Array.slice().buffer], { type: file.type || 'video/mp4' });
  }

  /**
   * 合并多个片段
   */
  async mergeSegments(
    file: File,
    segments: Segment[],
    onProgress?: (progress: number) => void
  ): Promise<{ blob: Blob; filename: string }> {
    if (!this.loaded) {
      await this.load();
    }

    const ext = getFileExtension(file.name) || '.mp4';
    const inputFileName = `input${ext}`;
    const outputFileName = generateMergedFilename(file.name);

    // 写入输入文件
    await this.ffmpeg.writeFile(inputFileName, await fetchFile(file));

    // 设置进度回调
    this.ffmpeg.on('progress', ({ progress }) => {
      onProgress?.(progress * 100);
    });

    // 创建 concat 文件列表
    const tempFiles: string[] = [];

    // 先切分每个片段
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const tempFileName = `temp_${i}${ext}`;
      tempFiles.push(tempFileName);

      await this.ffmpeg.exec([
        '-i',
        inputFileName,
        '-ss',
        segment.startTime.toString(),
        '-to',
        segment.endTime.toString(),
        '-c',
        'copy',
        tempFileName,
      ]);
    }

    // 创建 concat 列表文件
    const concatList = tempFiles.map((f) => `file '${f}'`).join('\n');
    await this.ffmpeg.writeFile('concat.txt', concatList);

    // 合并片段
    await this.ffmpeg.exec([
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      'concat.txt',
      '-c',
      'copy',
      outputFileName,
    ]);

    // 读取输出文件
    const data = await this.ffmpeg.readFile(outputFileName);
    const uint8Array = data as Uint8Array;

    // 清理所有临时文件
    await this.ffmpeg.deleteFile(inputFileName);
    await this.ffmpeg.deleteFile('concat.txt');
    for (const tempFile of tempFiles) {
      await this.ffmpeg.deleteFile(tempFile);
    }
    await this.ffmpeg.deleteFile(outputFileName);

    return {
      blob: new Blob([uint8Array.slice().buffer], { type: file.type || 'video/mp4' }),
      filename: outputFileName,
    };
  }
}

// 单例导出
export const ffmpegService = new FFmpegService();
