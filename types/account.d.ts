import type { MpAccount } from '~/store/v2/info';

export interface AccountManifest {
  version: string;
  usefor: 'wechat-article-exporter';
  accounts: MpAccount[];
}
