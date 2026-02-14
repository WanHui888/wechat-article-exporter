import { ref, computed } from 'vue'
import type { ExportFormat, ExportJob } from '~/types'
import { apiCreateExportJob, apiGetExportJobs, apiGetExportJob, apiDeleteExportJob, getExportDownloadUrl } from '~/apis/data'

export function useExporter() {
  const loading = ref(false)
  const jobs = ref<ExportJob[]>([])

  async function createExport(format: ExportFormat, articleUrls: string[], fakeid?: string) {
    loading.value = true
    try {
      const result = await apiCreateExportJob(format, articleUrls, fakeid)
      await loadJobs()
      return result
    } finally {
      loading.value = false
    }
  }

  async function loadJobs() {
    jobs.value = await apiGetExportJobs()
  }

  async function pollJob(jobId: number, onProgress?: (job: ExportJob) => void): Promise<ExportJob> {
    while (true) {
      const job = await apiGetExportJob(jobId)
      onProgress?.(job)

      if (job.status === 'completed' || job.status === 'failed') {
        await loadJobs()
        return job
      }

      await new Promise(r => setTimeout(r, 2000))
    }
  }

  async function deleteJob(jobId: number) {
    await apiDeleteExportJob(jobId)
    jobs.value = jobs.value.filter(j => j.id !== jobId)
  }

  function downloadJob(jobId: number) {
    const url = getExportDownloadUrl(jobId)
    window.open(url, '_blank')
  }

  return {
    loading,
    jobs,
    createExport,
    loadJobs,
    pollJob,
    deleteJob,
    downloadJob,
  }
}
