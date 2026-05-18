import { alibabaClient } from '../services/alibaba/client';
import path from 'path';

export function extractImageUrls(payload: any): string[] {
  console.log('[generation-service] Extracting image URLs from payload...');
  const output = payload?.output || {};
  const urls: string[] = [];

  // Choices format
  const choices = output.choices || [];
  if (choices.length > 0) {
    console.log('[generation-service] Found choices format, processing...');
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
    console.log('[generation-service] Found results format, processing...');
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
  const uniqueUrls = [...new Set(urls)];
  console.log(`[generation-service] Extracted ${uniqueUrls.length} unique image URLs`);
  return uniqueUrls;
}

export async function pollAlibabaTask(taskId: string, maxAttempts = 60, interval = 5000): Promise<any> {
  console.log(`[generation-service] Starting polling for task ${taskId}, max attempts: ${maxAttempts}`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`[generation-service] Poll attempt ${attempt + 1}/${maxAttempts} for task ${taskId}`);
    const result = await alibabaClient.getTaskResult(taskId);
    const status = result?.output?.task_status || 'UNKNOWN';
    
    console.log(`[generation-service] Task ${taskId} status: ${status}`);
    
    if (status === 'SUCCEEDED') {
      console.log(`[generation-service] Task ${taskId} completed successfully`);
      return result;
    }
    if (status === 'FAILED' || status === 'CANCELED') {
      console.error(`[generation-service] Task ${taskId} failed with status: ${status}`);
      throw new Error(`Task ${taskId} ended with status ${status}`);
    }
    
    console.log(`[generation-service] Task ${taskId} still running, waiting ${interval}ms...`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  console.error(`[generation-service] Task ${taskId} timed out after ${maxAttempts} attempts`);
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
