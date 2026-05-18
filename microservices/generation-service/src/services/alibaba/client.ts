import { env } from '../../config/env';

const WAN_IMAGE_SIZES: [number, number][] = [
  [1280, 1280], [1104, 1472], [1472, 1104],
  [960, 1696], [1696, 960], [856, 1536], [1536, 856],
];

function mapToWanSize(width: number, height: number): string {
  const targetRatio = width / Math.max(height, 1);
  const best = WAN_IMAGE_SIZES.reduce((prev, curr) => {
    const prevRatio = prev[0] / prev[1];
    const currRatio = curr[0] / curr[1];
    return Math.abs(currRatio - targetRatio) < Math.abs(prevRatio - targetRatio) ? curr : prev;
  });
  return `${best[0]}*${best[1]}`;
}

export class AlibabaClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = env.ALIBABA_API_BASE_URL;
    this.apiKey = env.ALIBABA_API_KEY;
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-DataInspection': JSON.stringify({ input: 'disable', output: 'disable' }),
    };
  }

  private ensureConfigured(): void {
    const key = (this.apiKey || '').trim();
    if (!key || key === 'your-alibaba-api-key') {
      throw new Error('ALIBABA_API_KEY no esta configurada');
    }
  }

  async generateWanImage(params: {
    prompt: string;
    model: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    refImagesB64?: string[];
    n?: number;
  }): Promise<any> {
    this.ensureConfigured();
    const { prompt, model, negativePrompt = '', width = 1280, height = 1280, refImagesB64, n = 1 } = params;
    const size = mapToWanSize(width, height);

    const isImage2Image = model === 'wan2.7-image-pro';
    let endpoint: string;
    let headers = { ...this.headers };
    let content: any[] = [];

    if (!isImage2Image) {
      // Text-to-image async
      content = [{ text: prompt }];
      endpoint = '/services/aigc/image-generation/generation';
      headers['X-DashScope-Async'] = 'enable';
    } else {
      // Image-to-image multimodal
      if (refImagesB64) {
        for (const img of refImagesB64) {
          const imgData = img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
          content.push({ image: imgData });
        }
      }
      content.push({ text: prompt });
      endpoint = '/services/aigc/multimodal-generation/generation';
    }

    const payload = {
      model,
      input: { messages: [{ role: 'user', content }] },
      parameters: {
        size,
        n: Math.max(1, n),
        negative_prompt: negativePrompt,
        prompt_extend: false,
        watermark: false,
        ...(isImage2Image ? {} : { max_images: Math.max(1, n), enable_interleave: true }),
      },
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`DashScope error HTTP ${response.status}: ${body.slice(0, 500)}`);
    }

    return response.json();
  }

  async getTaskResult(taskId: string): Promise<any> {
    this.ensureConfigured();
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to get task ${taskId}: ${response.status}`);
    }
    return response.json();
  }

  async downloadBytes(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
}

export const alibabaClient = new AlibabaClient();
