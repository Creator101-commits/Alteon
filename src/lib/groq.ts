export interface SummarizationRequest {
  content: string;
  type: 'quick' | 'detailed' | 'bullet';
  fileType?: 'pdf' | 'text' | 'audio' | 'youtube';
  model?: string;
}

export interface SummarizationResponse {
  summary: string;
  keyPoints: string[];
  studyNotes: string[];
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Available Groq models (updated for current supported models)
export const GROQ_MODELS = {
  'llama-3.1-70b-versatile': 'Llama 3.1 70B (Versatile)',
  'llama-3.1-8b-instant': 'Llama 3.1 8B (Fast)',
  'llama-3.2-90b-text-preview': 'Llama 3.2 90B (Preview)',
  'llama-3.2-11b-text-preview': 'Llama 3.2 11B (Preview)',
  'mixtral-8x7b-32768': 'Mixtral 8x7B (32K Context)',
  'gemma2-9b-it': 'Gemma2 9B (Instruction Tuned)',
} as const;

export type GroqModel = keyof typeof GROQ_MODELS;

/**
 * GroqAPI client that proxies all requests through `/api/ai/chat`
 * so the API key stays server-side only.
 */
export class GroqAPI {
  private defaultModel: GroqModel = 'llama-3.1-8b-instant';
  private userId: string;

  constructor(userId?: string) {
    this.userId = userId || 'anonymous';
  }

  /** Update the user ID used for auth headers */
  setUserId(uid: string) {
    this.userId = uid;
  }

  private async makeRequest(messages: ChatMessage[], options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }) {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId,
        },
        body: JSON.stringify({
          messages,
          model: options?.model || this.defaultModel,
          maxTokens: options?.maxTokens || 1000,
          temperature: options?.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMsg = (errorData as any).error || `AI service error (${response.status})`;

        if (response.status === 401) {
          throw new Error('Authentication required. Please sign in.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status >= 500) {
          throw new Error('AI service is temporarily unavailable. Please try again later.');
        } else {
          throw new Error(errorMsg);
        }
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      throw error;
    }
  }

  async summarizeContent(request: SummarizationRequest): Promise<SummarizationResponse> {
    const systemPrompt = this.getSystemPrompt(request.type);

    const data = await this.makeRequest(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Please summarize the following content:\n\n${request.content}` },
      ],
      { model: request.model, maxTokens: 2000, temperature: 0.3 },
    );

    const summary = data.choices?.[0]?.message?.content || '';

    if (!summary) {
      throw new Error('Empty summary response. Please try again.');
    }

    return {
      summary,
      keyPoints: this.extractKeyPoints(summary),
      studyNotes: this.extractStudyNotes(summary),
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const data = await this.makeRequest(request.messages, {
      model: request.model,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
    });

    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      throw new Error('Empty response from AI. Please try again.');
    }

    return {
      content,
      model: request.model || this.defaultModel,
      usage: data.usage,
    };
  }

  private getSystemPrompt(type: string): string {
    switch (type) {
      case 'quick':
        return 'You are a helpful AI assistant that creates concise summaries for students. Provide a brief, clear summary that captures the main points and essential information. Keep it under 200 words.';
      case 'detailed':
        return 'You are a helpful AI assistant that creates detailed summaries for students. Provide a comprehensive summary that includes main concepts, supporting details, examples, and important context. Organize the information clearly with headings and bullet points where appropriate.';
      case 'bullet':
        return 'You are a helpful AI assistant that creates bullet-point summaries for students. Convert the content into clear, organized bullet points that highlight key concepts, important facts, and actionable information. Use nested bullets for sub-points when needed.';
      default:
        return 'You are a helpful AI assistant that creates summaries for students. Provide a clear, well-organized summary that helps students understand and remember the key information.';
    }
  }

  private extractKeyPoints(summary: string): string[] {
    const lines = summary.split('\n').filter(line => line.trim());
    const keyPoints: string[] = [];

    lines.forEach(line => {
      if (line.includes('•') || line.includes('-') || line.includes('*')) {
        keyPoints.push(line.replace(/^[-•*]\s*/, '').trim());
      }
    });

    return keyPoints.slice(0, 5);
  }

  private extractStudyNotes(summary: string): string[] {
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 8).map(s => s.trim());
  }
}

// Default singleton — consumers can call setUserId() after auth resolves
export const groqAPI = new GroqAPI();
