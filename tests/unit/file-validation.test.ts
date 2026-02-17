import { describe, it, expect } from 'vitest'
import {
  validateFilename,
  validateFileExtension,
  validateFileSize,
  validateFilePath,
  validateFile,
  sanitizeFilename,
} from '~/server/utils/file-validation'

/**
 * File Validation 单元测试
 *
 * 测试覆盖：
 * 1. validateFilename - 文件名安全性验证
 * 2. validateFileExtension - 文件扩展名白名单验证
 * 3. validateFileSize - 文件大小限制验证
 * 4. validateFilePath - 文件路径安全验证（防止路径穿越）
 * 5. validateFile - 综合文件验证
 * 6. sanitizeFilename - 文件名清理
 */

// ==================== validateFilename() 测试 ====================

describe('validateFilename', () => {
  describe('Valid filenames', () => {
    it('should accept normal filename', () => {
      const result = validateFilename('document.pdf')
      expect(result.valid).toBe(true)
      expect(result.sanitizedFilename).toBe('document.pdf')
    })

    it('should accept filename with spaces', () => {
      const result = validateFilename('my document.pdf')
      expect(result.valid).toBe(true)
      expect(result.sanitizedFilename).toBe('my document.pdf')
    })

    it('should accept filename with numbers', () => {
      const result = validateFilename('file-123.txt')
      expect(result.valid).toBe(true)
      expect(result.sanitizedFilename).toBe('file-123.txt')
    })

    it('should accept filename with unicode characters', () => {
      const result = validateFilename('文档-2024.pdf')
      expect(result.valid).toBe(true)
      expect(result.sanitizedFilename).toBe('文档-2024.pdf')
    })

    it('should trim leading/trailing spaces', () => {
      const result = validateFilename('  document.pdf  ')
      expect(result.valid).toBe(true)
      expect(result.sanitizedFilename).toBe('document.pdf')
    })
  })

  describe('Invalid filenames', () => {
    it('should reject empty filename', () => {
      const result = validateFilename('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不能为空')
    })

    it('should reject whitespace-only filename', () => {
      const result = validateFilename('   ')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不能为空')
    })

    it('should reject filename with path traversal (..)', () => {
      const result = validateFilename('../etc/passwd')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('..')
    })

    it('should reject filename with forward slash', () => {
      const result = validateFilename('path/to/file.txt')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('路径分隔符')
    })

    it('should reject filename with backslash', () => {
      const result = validateFilename('path\\to\\file.txt')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('路径分隔符')
    })

    it('should reject filename with Windows illegal characters (<)', () => {
      const result = validateFilename('file<name.txt')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject filename with Windows illegal characters (>)', () => {
      const result = validateFilename('file>name.txt')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject filename with Windows illegal characters (:)', () => {
      const result = validateFilename('file:name.txt')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject filename with Windows illegal characters (")', () => {
      const result = validateFilename('file"name.txt')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject filename with Windows illegal characters (|)', () => {
      const result = validateFilename('file|name.txt')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject filename with Windows illegal characters (?)', () => {
      const result = validateFilename('file?name.txt')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject filename with Windows illegal characters (*)', () => {
      const result = validateFilename('file*name.txt')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject filename with control characters', () => {
      const result = validateFilename('file\x00name.txt')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject filename that is only dots', () => {
      const result = validateFilename('...')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject Windows reserved names (con)', () => {
      const result = validateFilename('con')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject Windows reserved names (prn)', () => {
      const result = validateFilename('PRN')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject Windows reserved names (aux)', () => {
      const result = validateFilename('aux')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject Windows reserved names (nul)', () => {
      const result = validateFilename('NUL')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject Windows reserved names (com1)', () => {
      const result = validateFilename('COM1')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })

    it('should reject Windows reserved names (lpt1)', () => {
      const result = validateFilename('LPT1')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })
  })
})

// ==================== validateFileExtension() 测试 ====================

describe('validateFileExtension', () => {
  describe('Valid extensions', () => {
    it('should accept .jpg extension', () => {
      const result = validateFileExtension('photo.jpg')
      expect(result.valid).toBe(true)
    })

    it('should accept .jpeg extension', () => {
      const result = validateFileExtension('photo.jpeg')
      expect(result.valid).toBe(true)
    })

    it('should accept .png extension', () => {
      const result = validateFileExtension('image.png')
      expect(result.valid).toBe(true)
    })

    it('should accept .gif extension', () => {
      const result = validateFileExtension('animation.gif')
      expect(result.valid).toBe(true)
    })

    it('should accept .webp extension', () => {
      const result = validateFileExtension('modern.webp')
      expect(result.valid).toBe(true)
    })

    it('should accept .pdf extension', () => {
      const result = validateFileExtension('document.pdf')
      expect(result.valid).toBe(true)
    })

    it('should accept .html extension', () => {
      const result = validateFileExtension('page.html')
      expect(result.valid).toBe(true)
    })

    it('should accept .txt extension', () => {
      const result = validateFileExtension('notes.txt')
      expect(result.valid).toBe(true)
    })

    it('should accept uppercase extension (case-insensitive)', () => {
      const result = validateFileExtension('photo.JPG')
      expect(result.valid).toBe(true)
    })

    it('should accept mixed-case extension', () => {
      const result = validateFileExtension('photo.JpEg')
      expect(result.valid).toBe(true)
    })
  })

  describe('Invalid extensions', () => {
    it('should reject .exe extension', () => {
      const result = validateFileExtension('malware.exe')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不支持的文件类型')
      expect(result.error).toContain('.exe')
    })

    it('should reject .bat extension', () => {
      const result = validateFileExtension('script.bat')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('.bat')
    })

    it('should reject .sh extension', () => {
      const result = validateFileExtension('script.sh')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('.sh')
    })

    it('should reject .php extension', () => {
      const result = validateFileExtension('shell.php')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('.php')
    })

    it('should reject .py extension', () => {
      const result = validateFileExtension('script.py')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('.py')
    })

    it('should reject unknown extension', () => {
      const result = validateFileExtension('file.unknown')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('.unknown')
    })
  })

  describe('No extension', () => {
    it('should reject file without extension by default', () => {
      const result = validateFileExtension('README')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('必须有扩展名')
    })

    it('should accept file without extension when allowed', () => {
      const result = validateFileExtension('README', { allowNoExtension: true })
      expect(result.valid).toBe(true)
    })

    it('should reject filename ending with dot', () => {
      const result = validateFileExtension('file.')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('必须有扩展名')
    })
  })

  describe('Custom allowed extensions', () => {
    it('should use custom allowed extensions list', () => {
      const config = { allowedExtensions: ['.xyz', '.abc'] }

      const result1 = validateFileExtension('file.xyz', config)
      expect(result1.valid).toBe(true)

      const result2 = validateFileExtension('file.jpg', config)
      expect(result2.valid).toBe(false)
    })

    it('should handle empty allowed extensions list', () => {
      const config = { allowedExtensions: [] }
      const result = validateFileExtension('file.txt', config)
      expect(result.valid).toBe(false)
    })
  })
})

// ==================== validateFileSize() 测试 ====================

describe('validateFileSize', () => {
  describe('Valid sizes', () => {
    it('should accept size within limit (1KB)', () => {
      const result = validateFileSize(1024)
      expect(result.valid).toBe(true)
    })

    it('should accept size within limit (1MB)', () => {
      const result = validateFileSize(1024 * 1024)
      expect(result.valid).toBe(true)
    })

    it('should accept size within limit (5MB)', () => {
      const result = validateFileSize(5 * 1024 * 1024)
      expect(result.valid).toBe(true)
    })

    it('should accept size at exact limit (10MB default)', () => {
      const result = validateFileSize(10 * 1024 * 1024)
      expect(result.valid).toBe(true)
    })

    it('should accept 1 byte file', () => {
      const result = validateFileSize(1)
      expect(result.valid).toBe(true)
    })
  })

  describe('Invalid sizes', () => {
    it('should reject 0 byte file', () => {
      const result = validateFileSize(0)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不能为空')
    })

    it('should reject negative size', () => {
      const result = validateFileSize(-100)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('无效')
    })

    it('should reject size exceeding default limit (11MB)', () => {
      const result = validateFileSize(11 * 1024 * 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('超过限制')
    })

    it('should reject size exceeding default limit (100MB)', () => {
      const result = validateFileSize(100 * 1024 * 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('超过限制')
      expect(result.error).toContain('100.00MB')
    })

    it('should include size information in error', () => {
      const result = validateFileSize(20 * 1024 * 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('20.00MB')
      expect(result.error).toContain('10.00MB')
    })
  })

  describe('Custom size limits', () => {
    it('should use custom max size (1MB)', () => {
      const config = { maxSize: 1024 * 1024 }

      const result1 = validateFileSize(500 * 1024, config)
      expect(result1.valid).toBe(true)

      const result2 = validateFileSize(2 * 1024 * 1024, config)
      expect(result2.valid).toBe(false)
    })

    it('should use custom max size (100MB)', () => {
      const config = { maxSize: 100 * 1024 * 1024 }

      const result = validateFileSize(50 * 1024 * 1024, config)
      expect(result.valid).toBe(true)
    })

    it('should accept file at exact custom limit', () => {
      const config = { maxSize: 5 * 1024 * 1024 }
      const result = validateFileSize(5 * 1024 * 1024, config)
      expect(result.valid).toBe(true)
    })

    it('should reject file just over custom limit', () => {
      const config = { maxSize: 5 * 1024 * 1024 }
      const result = validateFileSize(5 * 1024 * 1024 + 1, config)
      expect(result.valid).toBe(false)
    })
  })
})

// ==================== validateFilePath() 测试 ====================

describe('validateFilePath', () => {
  describe('Valid paths', () => {
    it('should accept normal relative path', () => {
      const result = validateFilePath('uploads/file.txt')
      expect(result.valid).toBe(true)
    })

    it('should accept absolute path', () => {
      const result = validateFilePath('/var/www/uploads/file.txt')
      expect(result.valid).toBe(true)
    })

    it('should accept Windows absolute path', () => {
      const result = validateFilePath('C:\\Users\\files\\document.pdf')
      expect(result.valid).toBe(true)
    })

    it('should accept nested directory path', () => {
      const result = validateFilePath('a/b/c/d/file.txt')
      expect(result.valid).toBe(true)
    })
  })

  describe('Path traversal attacks', () => {
    it('should reject path with ../ traversal', () => {
      const result = validateFilePath('../etc/passwd')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('路径穿越')
    })

    it('should reject path with ../../ traversal', () => {
      const result = validateFilePath('../../etc/passwd')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('路径穿越')
    })

    it('should reject path with ../ in middle', () => {
      const result = validateFilePath('uploads/../etc/passwd')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('路径穿越')
    })

    it('should reject Windows path with ..\\ traversal', () => {
      const result = validateFilePath('..\\windows\\system32')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('路径穿越')
    })

    it('should reject complex traversal attack', () => {
      const result = validateFilePath('uploads/../../etc/passwd')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('路径穿越')
    })
  })

  describe('Base directory validation', () => {
    it('should accept path within base directory', () => {
      const result = validateFilePath('/var/www/uploads/file.txt', '/var/www')
      expect(result.valid).toBe(true)
    })

    it('should accept nested path within base directory', () => {
      const result = validateFilePath('/var/www/uploads/images/photo.jpg', '/var/www/uploads')
      expect(result.valid).toBe(true)
    })

    it('should reject path outside base directory', () => {
      const result = validateFilePath('/etc/passwd', '/var/www')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不在允许的目录范围内')
    })

    it('should reject path attempting to escape base directory', () => {
      const result = validateFilePath('/var/www/../etc/passwd', '/var/www')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不在允许的目录范围内')
    })

    it('should handle Windows paths with base directory', () => {
      const result = validateFilePath('C:\\Users\\files\\document.pdf', 'C:\\Users\\files')
      expect(result.valid).toBe(true)
    })
  })
})

// ==================== validateFile() 测试 ====================

describe('validateFile', () => {
  describe('Valid files', () => {
    it('should accept valid file with normal name and size', () => {
      const result = validateFile('document.pdf', 1024 * 1024)
      expect(result.valid).toBe(true)
      expect(result.sanitizedFilename).toBe('document.pdf')
    })

    it('should accept image file', () => {
      const result = validateFile('photo.jpg', 500 * 1024)
      expect(result.valid).toBe(true)
      expect(result.sanitizedFilename).toBe('photo.jpg')
    })

    it('should accept HTML file', () => {
      const result = validateFile('page.html', 100 * 1024)
      expect(result.valid).toBe(true)
      expect(result.sanitizedFilename).toBe('page.html')
    })

    it('should accept file with unicode name', () => {
      const result = validateFile('测试文档.pdf', 1024)
      expect(result.valid).toBe(true)
      expect(result.sanitizedFilename).toBe('测试文档.pdf')
    })

    it('should trim spaces from filename', () => {
      const result = validateFile('  document.pdf  ', 1024)
      expect(result.valid).toBe(true)
      expect(result.sanitizedFilename).toBe('document.pdf')
    })
  })

  describe('Invalid filenames', () => {
    it('should reject empty filename', () => {
      const result = validateFile('', 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不能为空')
    })

    it('should reject filename with path traversal', () => {
      const result = validateFile('../etc/passwd', 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('..')
    })

    it('should reject filename with path separator', () => {
      const result = validateFile('path/to/file.txt', 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('路径分隔符')
    })

    it('should reject filename with illegal characters', () => {
      const result = validateFile('file<name>.txt', 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('非法字符')
    })
  })

  describe('Invalid extensions', () => {
    it('should reject executable file', () => {
      const result = validateFile('malware.exe', 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不支持的文件类型')
    })

    it('should reject script file', () => {
      const result = validateFile('script.sh', 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('.sh')
    })

    it('should reject file without extension', () => {
      const result = validateFile('README', 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('必须有扩展名')
    })
  })

  describe('Invalid sizes', () => {
    it('should reject zero-size file', () => {
      const result = validateFile('document.pdf', 0)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不能为空')
    })

    it('should reject oversized file', () => {
      const result = validateFile('document.pdf', 100 * 1024 * 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('超过限制')
    })

    it('should reject negative size', () => {
      const result = validateFile('document.pdf', -100)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('无效')
    })
  })

  describe('Custom configuration', () => {
    it('should use custom allowed extensions', () => {
      const config = { allowedExtensions: ['.xyz'] }

      const result1 = validateFile('file.xyz', 1024, config)
      expect(result1.valid).toBe(true)

      const result2 = validateFile('file.pdf', 1024, config)
      expect(result2.valid).toBe(false)
    })

    it('should use custom max size', () => {
      const config = { maxSize: 1024 }

      const result1 = validateFile('small.txt', 512, config)
      expect(result1.valid).toBe(true)

      const result2 = validateFile('large.txt', 2048, config)
      expect(result2.valid).toBe(false)
    })

    it('should allow file without extension when configured', () => {
      const config = { allowNoExtension: true }
      const result = validateFile('README', 1024, config)
      expect(result.valid).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('should handle file at exact size limit', () => {
      const result = validateFile('file.txt', 10 * 1024 * 1024)
      expect(result.valid).toBe(true)
    })

    it('should handle very small valid file', () => {
      const result = validateFile('tiny.txt', 1)
      expect(result.valid).toBe(true)
    })

    it('should handle long filename', () => {
      const longName = 'a'.repeat(200) + '.txt'
      const result = validateFile(longName, 1024)
      expect(result.valid).toBe(true)
    })
  })
})

// ==================== sanitizeFilename() 测试 ====================

describe('sanitizeFilename', () => {
  describe('Clean filenames', () => {
    it('should keep normal filename unchanged', () => {
      const result = sanitizeFilename('document.pdf')
      expect(result).toBe('document.pdf')
    })

    it('should keep filename with numbers', () => {
      const result = sanitizeFilename('file-123.txt')
      expect(result).toBe('file-123.txt')
    })

    it('should keep filename with unicode', () => {
      const result = sanitizeFilename('文档-2024.pdf')
      expect(result).toBe('文档-2024.pdf')
    })

    it('should keep filename with spaces', () => {
      const result = sanitizeFilename('my document.pdf')
      expect(result).toBe('my document.pdf')
    })
  })

  describe('Dangerous characters removal', () => {
    it('should remove .. from filename', () => {
      const result = sanitizeFilename('file..name.txt')
      expect(result).not.toContain('..')
    })

    it('should remove < from filename', () => {
      const result = sanitizeFilename('file<name.txt')
      expect(result).toBe('filename.txt')
    })

    it('should remove > from filename', () => {
      const result = sanitizeFilename('file>name.txt')
      expect(result).toBe('filename.txt')
    })

    it('should remove : from filename', () => {
      const result = sanitizeFilename('file:name.txt')
      expect(result).toBe('filename.txt')
    })

    it('should remove " from filename', () => {
      const result = sanitizeFilename('file"name.txt')
      expect(result).toBe('filename.txt')
    })

    it('should remove | from filename', () => {
      const result = sanitizeFilename('file|name.txt')
      expect(result).toBe('filename.txt')
    })

    it('should remove ? from filename', () => {
      const result = sanitizeFilename('file?name.txt')
      expect(result).toBe('filename.txt')
    })

    it('should remove * from filename', () => {
      const result = sanitizeFilename('file*name.txt')
      expect(result).toBe('filename.txt')
    })

    it('should remove control characters', () => {
      const result = sanitizeFilename('file\x00name.txt')
      expect(result).toBe('filename.txt')
    })

    it('should remove multiple dangerous characters', () => {
      const result = sanitizeFilename('file<>:|name.txt')
      expect(result).toBe('filename.txt')
    })
  })

  describe('Path handling', () => {
    it('should extract basename from path', () => {
      const result = sanitizeFilename('/path/to/file.txt')
      expect(result).toBe('file.txt')
    })

    it('should extract basename from Windows path', () => {
      const result = sanitizeFilename('C:\\Users\\files\\document.pdf')
      expect(result).toBe('document.pdf')
    })

    it('should handle path with .. separator', () => {
      const result = sanitizeFilename('../file.txt')
      expect(result).toBe('file.txt')
    })
  })

  describe('Edge cases', () => {
    it('should trim leading spaces', () => {
      const result = sanitizeFilename('   file.txt')
      expect(result).toBe('file.txt')
    })

    it('should trim trailing spaces', () => {
      const result = sanitizeFilename('file.txt   ')
      expect(result).toBe('file.txt')
    })

    it('should return default name for empty result', () => {
      const result = sanitizeFilename('...')
      expect(result).toBe('unnamed-file')
    })

    it('should return default name for only dangerous chars', () => {
      const result = sanitizeFilename('<>:|')
      expect(result).toBe('unnamed-file')
    })

    it('should return default name for only spaces', () => {
      const result = sanitizeFilename('     ')
      expect(result).toBe('unnamed-file')
    })

    it('should handle very long filename', () => {
      const longName = 'a'.repeat(300) + '.txt'
      const result = sanitizeFilename(longName)
      expect(result).toContain('.txt')
      expect(result.length).toBeGreaterThan(0)
    })
  })
})

// ==================== 集成场景测试 ====================

describe('Integration Scenarios', () => {
  it('should validate and sanitize uploaded image file', () => {
    const filename = '  vacation-photo.jpg  '
    const size = 2 * 1024 * 1024 // 2MB

    // Validate
    const validation = validateFile(filename, size)
    expect(validation.valid).toBe(true)

    // Sanitize
    const sanitized = sanitizeFilename(filename)
    expect(sanitized).toBe('vacation-photo.jpg')
  })

  it('should reject malicious file upload attempt', () => {
    const filename = '../../../etc/passwd'
    const size = 1024

    const validation = validateFile(filename, size)
    expect(validation.valid).toBe(false)
    expect(validation.error).toContain('..')
  })

  it('should reject executable masquerading as image', () => {
    const filename = 'image.exe'
    const size = 1024

    const validation = validateFile(filename, size)
    expect(validation.valid).toBe(false)
    expect(validation.error).toContain('.exe')
  })

  it('should handle file with mixed validation issues', () => {
    // Oversized file with dangerous characters
    const filename = 'file<name>.txt'
    const size = 100 * 1024 * 1024

    const validation = validateFile(filename, size)
    expect(validation.valid).toBe(false)
    // Should fail on filename check first
    expect(validation.error).toContain('非法字符')
  })

  it('should validate path for file storage', () => {
    const filePath = '/var/www/uploads/2024/01/file.pdf'
    const baseDir = '/var/www/uploads'

    const validation = validateFilePath(filePath, baseDir)
    expect(validation.valid).toBe(true)
  })

  it('should prevent path traversal in file storage', () => {
    const filePath = '/var/www/uploads/../../etc/passwd'
    const baseDir = '/var/www/uploads'

    const validation = validateFilePath(filePath, baseDir)
    expect(validation.valid).toBe(false)
  })
})
