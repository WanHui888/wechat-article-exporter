/**
 * 简单异步任务队列
 *
 * 用于异步处理非关键任务（如搜索索引更新）
 * 生产环境应使用 Redis + Bull 或其他专业队列系统
 */

interface QueueTask<T> {
  data: T
  execute: (data: T) => Promise<void>
}

export class SimpleQueue<T> {
  private queue: QueueTask<T>[] = []
  private processing = false
  private concurrency: number

  constructor(concurrency = 5) {
    this.concurrency = concurrency
  }

  /**
   * 添加任务到队列
   */
  add(data: T, execute: (data: T) => Promise<void>): void {
    this.queue.push({ data, execute })
    this.process()
  }

  /**
   * 处理队列中的任务
   */
  private async process(): Promise<void> {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      // 取出一批任务并行处理
      const batch = this.queue.splice(0, this.concurrency)
      await Promise.allSettled(
        batch.map(task => task.execute(task.data)),
      )
    }

    this.processing = false
  }

  /**
   * 获取队列长度
   */
  size(): number {
    return this.queue.length
  }
}

// 导出全局队列实例
export const searchIndexQueue = new SimpleQueue<any>(5)
