import dayjs from 'dayjs';
import { ITEM_SHOW_TYPE } from '~/config';

export function sleep(ms: number = 1000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function timeout(ms: number = 1000): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('operation timeout')), ms);
  });
}

export function throwException(message: string) {
  throw new Error(message);
}

export function maxLen(text: string, max = 35): string {
  if (text.length > max) {
    return text.slice(0, max) + '...';
  }
  return text;
}

// 过滤文件名中的非法字符
export function filterInvalidFilenameChars(input: string): string {
  // 只保留中文字符、英文字符、数字
  const regex = /[^\u4e00-\u9fa5a-zA-Z0-9()（）]/g;
  return input.replace(regex, '_').slice(0, 100).trim();
}

// 格式化消耗时间
export function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let result = '';
  if (hours > 0) {
    result += `${hours}小时`;
  }
  if (minutes > 0) {
    result += `${minutes}分`;
  }
  if (secs > 0 || result === '') {
    result += `${secs}秒`;
  }
  return result;
}

// 将时长字符串转为秒数
export function durationToSeconds(duration: string | undefined) {
  if (!duration) return 0;
  const [min, sec] = duration.split(':').map(Number);
  return min * 60 + sec;
}

// 时间戳(单位秒)转日期字符串
export function formatTimeStamp(timestamp: number) {
  return dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss');
}

// 格式化文章显示类型
export function formatItemShowType(type: number) {
  return ITEM_SHOW_TYPE[type] || '未识别';
}
