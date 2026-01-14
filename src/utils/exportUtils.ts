/**
 * 非法文件名字符正则
 */
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

/**
 * 清理文件名，移除非法字符
 * @param name 原始名称
 * @returns 清理后的名称
 */
export function sanitizeFilename(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'untitled';
  }
  const sanitized = name.trim().replace(INVALID_FILENAME_CHARS, '_');
  return sanitized || 'untitled';
}

/**
 * 生成导出文件名
 * @param segmentName 片段名称
 * @param originalExt 原始文件扩展名
 * @returns 完整的导出文件名
 */
export function generateExportFilename(segmentName: string, originalExt: string): string {
  const safeName = sanitizeFilename(segmentName);
  const ext = originalExt.startsWith('.') ? originalExt : `.${originalExt}`;
  return `${safeName}${ext.toLowerCase()}`;
}

/**
 * 生成合并导出文件名
 * @param originalFilename 原始文件名
 * @returns 合并后的文件名
 */
export function generateMergedFilename(originalFilename: string): string {
  const lastDot = originalFilename.lastIndexOf('.');
  const name = lastDot > 0 ? originalFilename.slice(0, lastDot) : originalFilename;
  const ext = lastDot > 0 ? originalFilename.slice(lastDot) : '.mp4';
  return `${sanitizeFilename(name)}_merged${ext.toLowerCase()}`;
}

/**
 * 触发浏览器下载
 * @param blob 文件 Blob
 * @param filename 文件名
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
