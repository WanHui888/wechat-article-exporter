/**
 * 启动时验证必需的环境变量
 *
 * 关键安全措施：
 * - 强制要求 JWT_SECRET 和 DB_PASSWORD
 * - 验证 JWT_SECRET 强度（≥32字符）
 * - 服务启动失败时提供明确的错误提示
 */

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  // 定义必需的环境变量
  const requiredVars = {
    jwtSecret: config.jwtSecret,
    dbPassword: config.dbPassword,
  }

  // 检查缺失的环境变量
  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    const errorMsg = [
      '❌ Missing required environment variables:',
      missing.map(key => `   - ${key}`).join('\n'),
      '',
      '💡 Please check your .env file and ensure all required variables are set.',
      '   See .env.example for reference.',
    ].join('\n')

    throw new Error(errorMsg)
  }

  // 验证 JWT_SECRET 强度
  if (config.jwtSecret.length < 32) {
    throw new Error(
      '❌ JWT_SECRET must be at least 32 characters long for security.\n' +
      '💡 Generate a strong secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    )
  }

  // 启动成功
  console.log('✅ Environment variables validated successfully')
})
