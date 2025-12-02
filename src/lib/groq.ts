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

export class GroqAPI {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1';
  private defaultModel: GroqModel = 'llama-3.1-8b-instant'; // Use currently supported fast model

  constructor() {
    // Try to get API key from environment variables first, then fall back to hardcoded
    this.apiKey = import.meta.env.VITE_GROQ_API_KEY || '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';
    
    if (!this.apiKey || this.apiKey === 'your_groq_api_key_here') {
      console.warn('Groq API key not configured properly. Please set VITE_GROQ_API_KEY in your .env file.');
    }
  }

  private async makeRequest(endpoint: string, data: any) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        console.error('Groq API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        // Provide more specific error messages
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your Groq API configuration.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 400) {
          const errorMsg = errorData.error?.message || 'Invalid request format';
          throw new Error(`Bad request: ${errorMsg}`);
        } else if (response.status >= 500) {
          throw new Error('Groq API server error. Please try again later.');
        } else {
          throw new Error(`Groq API error (${response.status}): ${errorData.error?.message || response.statusText}`);
        }
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      throw error;
    }
  }

  async summarizeContent(request: SummarizationRequest): Promise<SummarizationResponse> {
    const systemPrompt = this.getSystemPrompt(request.type);
    
    try {
      // Validate API key before making request
      if (!this.apiKey || this.apiKey === 'your_groq_api_key_here') {
        throw new Error('Invalid API key. Please check your Groq API configuration.');
      }

      const response = await this.makeRequest('/chat/completions', {
        model: request.model || this.defaultModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Please summarize the following content:\n\n${request.content}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
        stream: false,
      });

      const summary = response.choices[0]?.message?.content || '';
      
      if (!summary) {
        throw new Error('Empty summary response. Please try again.');
      }
      
      return {
        summary,
        keyPoints: this.extractKeyPoints(summary),
        studyNotes: this.extractStudyNotes(summary),
      };
    } catch (error) {
      console.error('Error summarizing content:', error);
      
      // Re-throw with more specific error message
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to generate summary. Please try again.');
      }
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Validate API key before making request
      if (!this.apiKey || this.apiKey === 'your_groq_api_key_here') {
        throw new Error('Invalid API key. Please check your Groq API configuration.');
      }

      const response = await this.makeRequest('/chat/completions', {
        model: request.model || this.defaultModel,
        messages: request.messages,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7,
        stream: false,
      });

      const content = response.choices[0]?.message?.content || '';
      
      if (!content) {
        throw new Error('Empty response from AI. Please try again.');
      }
      
      return {
        content,
        model: request.model || this.defaultModel,
        usage: response.usage,
      };
    } catch (error) {
      console.error('Error in chat:', error);
      
      // Re-throw with more specific error message
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to get chat response. Please try again.');
      }
    }
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
    // Extract key points from the summary text
    const lines = summary.split('\n').filter(line => line.trim());
    const keyPoints: string[] = [];
    
    lines.forEach(line => {
      if (line.includes('•') || line.includes('-') || line.includes('*')) {
        keyPoints.push(line.replace(/^[-•*]\s*/, '').trim());
      }
    });
    
    return keyPoints.slice(0, 5); // Limit to 5 key points
  }

  private extractStudyNotes(summary: string): string[] {
    // Extract study notes from the summary
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 8).map(s => s.trim()); // Limit to 8 study notes
  }
}

export const groqAPI = new GroqAPI();
