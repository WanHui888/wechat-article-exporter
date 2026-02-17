/**
 * 文件上传安全验证工具
 *
 * 功能：
 * 1. 文件类型白名单验证
 * 2. 文件大小限制检查
 * 3. 文件名安全性验证（防止路径穿越攻击）
 * 4. MIME 类型验证
 */

import { extname, basename, normalize, sep } from 'node:path'

/**
 * 文件验证配置
 */
export interface FileValidationConfig {
  /** 允许的文件扩展名（小写，带点，如 ['.jpg', '.png']） */
  allowedExtensions?: string[]
  /** 最大文件大小（字节） */
  maxSize?: number
  /** 是否允许无扩展名文件 */
  allowNoExtension?: boolean
}

/**
 * 文件验证结果
 */
export interface FileValidationResult {
  /** 是否验证通过 */
  valid: boolean
  /** 错误信息（验证失败时） */
  error?: string
  /** 安全的文件名（验证通过时） */
  sanitizedFilename?: string
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<FileValidationConfig> = {
  allowedExtensions: [
    // 图片
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
    // 文档
    '.html', '.htm', '.txt', '.md', '.json', '.xml',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    // 其他
    '.css', '.js', '.woff', '.woff2', '.ttf', '.eot',
  ],
  maxSize: 10 * 1024 * 1024, // 10MB
  allowNoExtension: false,
}

/**
 * 危险字符和模式（用于文件名验证）
 */
const DANGEROUS_PATTERNS = [
  /\.\./,           // 路径穿越 (..)
  /[<>:"|?*]/,      // Windows 非法字符
  /[\x00-\x1f\x80-\x9f]/, // 控制字符
  /^\.+$/,           // 仅点号
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Windows 保留名
]

/**
 * 验证文件名是否安全
 *
 * @param filename - 文件名
 * @returns 验证结果
 */
export function validateFilename(filename: string): FileValidationResult {
  // 空文件名
  if (!filename || filename.trim().length === 0) {
    return {
      valid: false,
      error: '文件名不能为空',
    }
  }

  // 检查路径穿越攻击
  if (filename.includes('..')) {
    return {
      valid: false,
      error: '文件名包含非法字符 ".."',
    }
  }

  // 检查路径分隔符
  if (filename.includes('/') || filename.includes('\\')) {
    return {
      valid: false,
      error: '文件名不能包含路径分隔符',
    }
  }

  // 提取基本文件名（移除路径部分）
  const base = basename(filename)

  // 检查危险模式
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(base)) {
      return {
        valid: false,
        error: `文件名包含非法字符或模式: ${base}`,
      }
    }
  }

  // 清理文件名（移除前后空格）
  const sanitized = base.trim()

  if (sanitized.length === 0) {
    return {
      valid: false,
      error: '文件名无效',
    }
  }

  return {
    valid: true,
    sanitizedFilename: sanitized,
  }
}

/**
 * 验证文件扩展名
 *
 * @param filename - 文件名
 * @param config - 验证配置
 * @returns 验证结果
 */
export function validateFileExtension(
  filename: string,
  config: FileValidationConfig = {}
): FileValidationResult {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  const ext = extname(filename).toLowerCase()

  // 无扩展名检查
  if (!ext || ext === '.') {
    if (mergedConfig.allowNoExtension) {
      return { valid: true }
    }
    return {
      valid: false,
      error: '文件必须有扩展名',
    }
  }

  // 白名单检查
  if (!mergedConfig.allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `不支持的文件类型: ${ext}`,
    }
  }

  return { valid: true }
}

/**
 * 验证文件大小
 *
 * @param size - 文件大小（字节）
 * @param config - 验证配置
 * @returns 验证结果
 */
export function validateFileSize(
  size: number,
  config: FileValidationConfig = {}
): FileValidationResult {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  if (size < 0) {
    return {
      valid: false,
      error: '文件大小无效',
    }
  }

  if (size === 0) {
    return {
      valid: false,
      error: '文件不能为空',
    }
  }

  if (size > mergedConfig.maxSize) {
    const maxMB = (mergedConfig.maxSize / 1024 / 1024).toFixed(2)
    const sizeMB = (size / 1024 / 1024).toFixed(2)
    return {
      valid: false,
      error: `文件大小 ${sizeMB}MB 超过限制 ${maxMB}MB`,
    }
  }

  return { valid: true }
}

/**
 * 验证文件路径（防止路径穿越）
 *
 * @param filePath - 文件路径
 * @param baseDir - 基础目录（可选）
 * @returns 验证结果
 */
export function validateFilePath(
  filePath: string,
  baseDir?: string
): FileValidationResult {
  // 标准化路径
  const normalized = normalize(filePath)

  // 如果提供了基础目录，优先检查路径是否在基础目录内
  if (baseDir) {
    const normalizedBase = normalize(baseDir)
    if (!normalized.startsWith(normalizedBase)) {
      return {
        valid: false,
        error: '路径不在允许的目录范围内',
      }
    }
    return { valid: true }
  }

  // 如果没有提供基础目录，检查路径穿越
  if (filePath.includes('..')) {
    return {
      valid: false,
      error: '路径包含非法的路径穿越字符',
    }
  }

  // 再次检查标准化后的路径
  if (normalized.includes(`..${sep}`) || normalized.startsWith(`..${sep}`) || normalized === '..') {
    return {
      valid: false,
      error: '路径包含非法的路径穿越字符',
    }
  }

  return { valid: true }
}

/**
 * 综合验证文件
 *
 * @param filename - 文件名
 * @param size - 文件大小（字节）
 * @param config - 验证配置
 * @returns 验证结果
 */
export function validateFile(
  filename: string,
  size: number,
  config: FileValidationConfig = {}
): FileValidationResult {
  // 1. 验证文件名安全性
  const filenameResult = validateFilename(filename)
  if (!filenameResult.valid) {
    return filenameResult
  }

  // 使用清理后的文件名进行后续验证
  const sanitizedName = filenameResult.sanitizedFilename!

  // 2. 验证文件扩展名
  const extResult = validateFileExtension(sanitizedName, config)
  if (!extResult.valid) {
    return extResult
  }

  // 3. 验证文件大小
  const sizeResult = validateFileSize(size, config)
  if (!sizeResult.valid) {
    return sizeResult
  }

  return {
    valid: true,
    sanitizedFilename: sanitizedName,
  }
}

/**
 * 清理文件名（移除危险字符）
 *
 * @param filename - 原始文件名
 * @returns 清理后的安全文件名
 */
export function sanitizeFilename(filename: string): string {
  // 提��基本文件名
  let sanitized = basename(filename)

  // 移除危险字符
  sanitized = sanitized
    .replace(/\.\./g, '') // 移除 ..
    .replace(/[<>:"|?*]/g, '') // 移除 Windows 非法字符
    .replace(/[\x00-\x1f\x80-\x9f]/g, '') // 移除控制字符
    .trim()

  // 如果清理后为空或仅为点号，返回默认名称
  if (!sanitized || /^\.+$/.test(sanitized)) {
    return 'unnamed-file'
  }

  return sanitized
}
