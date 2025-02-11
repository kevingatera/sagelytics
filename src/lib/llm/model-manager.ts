import { ChatGroq } from "@langchain/groq";
import { env } from "~/env";

export type ModelConfig = {
  model: string;
  tokensPerMinute: number;
  requestsPerMinute: number;
  tokensPerDay?: number;
  requestsPerDay?: number;
  // Performance metrics
  qualityScore: number;     // 0-100
  throughput: number;       // tokens/sec
  latency: number;         // seconds
  contextWindow: number;    // tokens
  complexity: number;      // 0-100, higher means better at complex tasks
};

const MODELS: ModelConfig[] = [
  { 
    model: "llama3-70b-8192",
    tokensPerMinute: 6000,
    requestsPerMinute: 30,
    qualityScore: 74,      // Based on artificialanalysis.ai
    throughput: 71.5,      // Based on artificialanalysis.ai
    latency: 0.50,         // Based on artificialanalysis.ai
    contextWindow: 128000,  // 128k
    complexity: 90         // High complexity handling
  },
  { 
    model: "deepseek-r1-distill-llama-70b",
    tokensPerMinute: 6000,
    requestsPerMinute: 30,
    qualityScore: 70,      // Similar to Llama 3
    throughput: 65,        // Conservative estimate
    latency: 0.55,         // Slightly higher than Llama 3
    contextWindow: 128000,
    complexity: 85         // Very good at complex tasks
  },
  { 
    model: "llama3-8b-8192",
    tokensPerMinute: 6000,
    requestsPerMinute: 30,
    qualityScore: 65,      // Smaller model = lower quality
    throughput: 120,       // Faster due to smaller size
    latency: 0.35,         // Lower latency due to size
    contextWindow: 8192,
    complexity: 60         // Good for simple tasks
  },
  { 
    model: "mixtral-8x7b-32768",
    tokensPerMinute: 5000,
    requestsPerMinute: 30,
    qualityScore: 68,      // Based on benchmarks
    throughput: 100,       // MoE architecture helps
    latency: 0.45,         // Decent latency
    contextWindow: 32768,
    complexity: 75         // Good for medium complexity
  },
  { 
    model: "gemma2-9b-it",
    tokensPerMinute: 15000,
    requestsPerMinute: 30,
    qualityScore: 63,      // Smaller model
    throughput: 110,       // Fast but smaller
    latency: 0.40,         // Good latency
    contextWindow: 8192,
    complexity: 55         // Better for simple tasks
  }
];

type ModelUsage = {
  lastUsed: number;
  tokensUsed: number;
  requestsUsed: number;
};

type TaskComplexity = 'simple' | 'medium' | 'complex';

type BatchRequest<T> = {
  prompt: string;
  operation: (llm: ChatGroq) => Promise<T>;
  preferredModel?: string;
  priority?: number;
};

type BatchResult<T> = {
  result: T | null;
  error?: Error;
  model: string;
  tokens: number;
};

type BatchQueue<T> = {
  requests: BatchRequest<T>[];
  timestamp: number;
  processing: boolean;
};

export class ModelManager {
  private modelUsage: Map<string, ModelUsage>;
  private retryDelays: number[];
  private currentModelIndex: number;
  private batchQueues: Map<string, BatchQueue<any>>;
  private batchProcessingIntervals: Map<string, NodeJS.Timeout>;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_WINDOW_MS = 10000; // 10 seconds

  constructor() {
    this.modelUsage = new Map();
    this.retryDelays = [1000, 2000, 4000, 8000, 16000];
    this.currentModelIndex = 0;
    this.batchQueues = new Map();
    this.batchProcessingIntervals = new Map();

    // Initialize usage tracking for all models
    MODELS.forEach(({ model }) => {
      this.modelUsage.set(model, {
        lastUsed: 0,
        tokensUsed: 0,
        requestsUsed: 0,
      });
      this.batchQueues.set(model, {
        requests: [],
        timestamp: Date.now(),
        processing: false
      });
      
      // Start batch processing interval for each model
      const interval = setInterval(() => {
        this.processQueueForModel(model).catch(console.error);
      }, this.BATCH_WINDOW_MS);
      
      this.batchProcessingIntervals.set(model, interval);
    });
  }

  private getTaskComplexity(prompt: string): TaskComplexity {
    // Analyze prompt complexity based on characteristics
    const hasJsonParsing = prompt.includes('Return ONLY a JSON');
    const hasMultipleSteps = prompt.includes('considering:') || prompt.includes('steps:');
    const hasAnalysis = prompt.includes('Analyze') || prompt.includes('Compare');
    
    if (hasJsonParsing && hasMultipleSteps && hasAnalysis) return 'complex';
    if (hasJsonParsing || hasMultipleSteps || hasAnalysis) return 'medium';
    return 'simple';
  }

  private getModelScore(model: ModelConfig, taskComplexity: TaskComplexity): number {
    // Weight factors based on task complexity
    const weights = {
      simple: {
        qualityScore: 0.2,
        throughput: 0.3,
        latency: 0.3,
        contextWindow: 0.1,
        complexity: 0.1
      },
      medium: {
        qualityScore: 0.3,
        throughput: 0.2,
        latency: 0.2,
        contextWindow: 0.1,
        complexity: 0.2
      },
      complex: {
        qualityScore: 0.3,
        throughput: 0.1,
        latency: 0.1,
        contextWindow: 0.2,
        complexity: 0.3
      }
    };

    const w = weights[taskComplexity];
    
    // Normalize scores
    const normalizedContextWindow = model.contextWindow / 128000; // Normalize to largest context
    
    return (
      w.qualityScore * (model.qualityScore / 100) +
      w.throughput * (model.throughput / 120) +  // Normalize to fastest
      w.latency * (1 - model.latency / 1) +     // Lower latency is better
      w.contextWindow * normalizedContextWindow +
      w.complexity * (model.complexity / 100)
    );
  }

  private getBestAvailableModel(taskComplexity: TaskComplexity): string | null {
    const availableModels = MODELS.filter(m => this.canUseModel(m.model))
      .sort((a, b) => this.getModelScore(b, taskComplexity) - this.getModelScore(a, taskComplexity));
    
    return availableModels[0]?.model || null;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private resetUsageIfNeeded(model: string): void {
    const usage = this.modelUsage.get(model);
    if (!usage) return;

    const now = Date.now();
    const minuteAgo = now - 60000;

    if (usage.lastUsed < minuteAgo) {
      this.modelUsage.set(model, {
        lastUsed: now,
        tokensUsed: 0,
        requestsUsed: 0,
      });
    }
  }

  private canUseModel(model: string): boolean {
    const config = MODELS.find(m => m.model === model);
    const usage = this.modelUsage.get(model);
    
    if (!config || !usage) return false;
    
    this.resetUsageIfNeeded(model);
    
    return usage.tokensUsed < config.tokensPerMinute &&
           usage.requestsUsed < config.requestsPerMinute;
  }

  private updateUsage(model: string, tokens: number): void {
    const usage = this.modelUsage.get(model);
    if (!usage) return;

    this.modelUsage.set(model, {
      lastUsed: Date.now(),
      tokensUsed: usage.tokensUsed + tokens,
      requestsUsed: usage.requestsUsed + 1,
    });
  }

  async getLLM(prompt: string, preferredModel = "llama3-70b-8192"): Promise<ChatGroq> {
    const taskComplexity = this.getTaskComplexity(prompt);
    
    for (const delay of this.retryDelays) {
      // Try preferred model first if specified
      if (preferredModel && this.canUseModel(preferredModel)) {
        return new ChatGroq({
          apiKey: env.GROQ_API_KEY,
          model: preferredModel,
        });
      }

      // Find best available model based on task complexity
      const bestModel = this.getBestAvailableModel(taskComplexity);
      if (bestModel) {
        if (bestModel !== preferredModel) {
          console.log(`Using optimized model for ${taskComplexity} task: ${bestModel}`);
        }
        return new ChatGroq({
          apiKey: env.GROQ_API_KEY,
          model: bestModel,
        });
      }

      await this.sleep(delay);
    }

    throw new Error("All models are rate limited. Please try again later.");
  }

  async withErrorHandling<T>(
    operation: (llm: ChatGroq) => Promise<T>,
    prompt: string,
    preferredModel?: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (const delay of this.retryDelays) {
      try {
        console.log({ model: preferredModel }, 'LLM request started');
        const llm = await this.getLLM(prompt, preferredModel);
        const result = await operation(llm);
        
        const estimatedTokens = JSON.stringify(result).length / 4;
        this.updateUsage(llm.model!, estimatedTokens);
        
        console.log({ model: llm.model, tokens: estimatedTokens }, 'LLM request succeeded');
        return result;
      } catch (error) {
        const err = error as Error;
        console.error({ 
          error: err.message,
          model: preferredModel,
          prompt: prompt.substring(0, 100) + '...' 
        }, 'LLM request failed');
        
        if (err.message.includes("Rate limit reached")) {
          console.log({ model: preferredModel, delay }, 'Rate limit encountered');
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }
    
    console.error('LLM operation failed after all retries');
    throw lastError || new Error("Operation failed after multiple retries");
  }

  private async processQueueForModel(model: string): Promise<void> {
    const queue = this.batchQueues.get(model);
    if (!queue || queue.processing || queue.requests.length === 0) {
      return;
    }

    queue.processing = true;
    try {
      // Process all available requests up to BATCH_SIZE
      const batchSize = Math.min(queue.requests.length, this.BATCH_SIZE);
      const batch = queue.requests.splice(0, batchSize);
      const results = await this.processBatch(model, batch);

      // Handle results
      results.forEach((result) => {
        if (result.error) {
          console.error('Batch request failed:', result.error);
        }
      });
    } finally {
      queue.processing = false;
      queue.timestamp = Date.now();
    }
  }

  private async processBatch<T>(model: string, batch: BatchRequest<T>[]): Promise<BatchResult<T>[]> {
    const llm = new ChatGroq({
      apiKey: env.GROQ_API_KEY,
      model,
    });

    const results: BatchResult<T>[] = [];
    let totalTokens = 0;

    try {
      // Process requests sequentially to respect rate limits
      for (const request of batch) {
        try {
          const result = await request.operation(llm);
          const tokens = JSON.stringify(result).length / 4;
          totalTokens += tokens;
          results.push({
            result,
            model,
            tokens
          });
          
          // Update usage after each request
          this.updateUsage(model, tokens);
          
          // Small delay between requests to prevent rate limits
          await this.sleep(100);
        } catch (error) {
          results.push({
            result: null,
            error: error as Error,
            model,
            tokens: 0
          });
        }
      }
    } catch (error) {
      console.error('Batch processing failed:', error);
      results.push(...batch.map(() => ({
        result: null,
        error: error as Error,
        model,
        tokens: 0
      })));
    }

    return results;
  }

  async addToBatch<T>(request: BatchRequest<T>): Promise<T> {
    const taskComplexity = this.getTaskComplexity(request.prompt);
    const model = request.preferredModel || this.getBestAvailableModel(taskComplexity) || MODELS[0]?.model || "llama3-70b-8192";
    
    const queue = this.batchQueues.get(model);
    if (!queue) {
      throw new Error(`No queue found for model ${model}`);
    }

    return new Promise((resolve, reject) => {
      const enhancedRequest: BatchRequest<T> = {
        ...request,
        operation: async (llm) => {
          try {
            const result = await request.operation(llm);
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        }
      };

      queue.requests.push(enhancedRequest);
    });
  }

  // Clean up intervals when the manager is destroyed
  destroy() {
    for (const interval of this.batchProcessingIntervals.values()) {
      clearInterval(interval);
    }
    this.batchProcessingIntervals.clear();
  }

  async withBatchProcessing<T>(
    operation: (llm: ChatGroq) => Promise<T>,
    prompt: string,
    preferredModel?: string
  ): Promise<T> {
    const request: BatchRequest<T> = {
      prompt,
      operation,
      preferredModel
    };

    try {
      console.log({ model: preferredModel }, 'Batch request started');
      const result = await this.addToBatch(request);
      console.log({ model: preferredModel }, 'Batch request completed');
      return result;
    } catch (error) {
      console.error('Batch processing failed, falling back to regular processing:', error);
      // Fallback to regular processing if batch fails
      return this.withErrorHandling(operation, prompt, preferredModel);
    }
  }
} 