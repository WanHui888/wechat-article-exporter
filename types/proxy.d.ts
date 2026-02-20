interface Base {
  name: string;
  domain: string;
}

interface Metric {
  dailyRequests: number;
  dailyCpuTimeUs: number;
  monthlyRequests: number;
  monthlyCpuUs: number;
}
export interface AccountMetric extends Base {
  metric: Metric | null;
}
