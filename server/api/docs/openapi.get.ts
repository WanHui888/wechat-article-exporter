/**
 * OpenAPI 规范 JSON 端点
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import YAML from 'yaml'

export default defineEventHandler(async () => {
  const yamlPath = join(process.cwd(), 'docs', 'openapi.yaml')
  const yamlContent = await readFile(yamlPath, 'utf-8')
  const openapi = YAML.parse(yamlContent)

  return openapi
})
