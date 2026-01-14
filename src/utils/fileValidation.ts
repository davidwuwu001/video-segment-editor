const SUPPORTED_FORMATS = ['.mp4', '.mov', '.avi', '.mkv'];

/**
 * 验证文件是否为支持的视频格式
 * @param filename 文件名
 * @returns 是否为支持的格式
 */
export function isValidVideoFormat(filename: string): boolean {
  if (!filename || typeof filename !== 'string') {
    return false;
  }
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return SUPPORTED_FORMATS.includes(ext);
}

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 扩展名（包含点号）
 */
export function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return '';
  }
  return filename.slice(lastDot).toLowerCase();
}

/**
 * 获取支持的格式列表
 */
export function getSupportedFormats(): string[] {
  return [...SUPPORTED_FORMATS];
}
