import { alibabaClient } from './alibaba/client';
import path from 'path';

export function extractImageUrls(payload: any): string[] {
  const output = payload?.output || {};
  const urls: string[] = [];

  // Choices format
  const choices = output.choices || [];
  if (choices.length > 0) {
    const content = choices[0]?.message?.content || [];
    if (Array.isArray(content)) {
      for (const item of content) {
        const url = item?.image || item?.image_url || item?.url;
        if (typeof url === 'string' && url.startsWith('http')) {
          urls.push(url);
        }
      }
    }
  }

  // Results format
  const results = output.results || [];
  if (Array.isArray(results)) {
    for (const item of results) {
      const url = item?.url || item?.image_url || item?.image;
      if (typeof url === 'string' && url.startsWith('http')) {
        urls.push(url);
      }
    }
  }

  // Direct URL
  const direct = output.image_url || output.image;
  if (typeof direct === 'string' && direct.startsWith('http')) {
    urls.push(direct);
  }

  // Dedupe
  return [...new Set(urls)];
}

export async function pollAlibabaTask(taskId: string, maxAttempts = 60, interval = 5000): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await alibabaClient.getTaskResult(taskId);
    const status = result?.output?.task_status || 'UNKNOWN';
    
    if (status === 'SUCCEEDED') {
      return result;
    }
    if (status === 'FAILED' || status === 'CANCELED') {
      throw new Error(`Task ${taskId} ended with status ${status}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Task ${taskId} did not complete in time`);
}

export function guessExtension(url: string, fallback = 'png'): string {
  const ext = path.extname(new URL(url).pathname).toLowerCase().replace('.', '');
  return ext && ext.length <= 5 ? ext : fallback;
}

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
