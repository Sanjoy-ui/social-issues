import { agentConfig } from "../config/agent.config.js";

export interface LLMTestResult {
  ok: boolean;
  provider: "nvidia";
  model: string;
  latencyMs: number;
  sampleResponse?: string;
  error?: string;
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface GenerateTextOptions {
  prompt: string;
  systemPrompt?: string;
  imageUrls?: string[];
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: "low" | "medium" | "high" | "max";
}

/**
 * Ping and test NVIDIA NIM LLM provider connectivity (moonshotai/kimi-k3)
 */
export async function testLLMConnectivity(): Promise<LLMTestResult> {
  const { apiKey, model, baseUrl, reasoningEffort } = agentConfig.nvidia;
  const startTime = Date.now();

  if (!apiKey) {
    return {
      ok: false,
      provider: "nvidia",
      model,
      latencyMs: 0,
      error: "NVIDIA_API_KEY is missing or empty in .env",
    };
  }

  try {
    const invokeUrl = `${baseUrl}/chat/completions`;
    const payload = {
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "CivicResolve AI Agent health check ping. Reply with 'PONG'." },
          ],
        },
      ],
      max_tokens: 256,
      seed: 0,
      temperature: 0.6,
      reasoning_effort: "low",
    };

    const response = await fetch(invokeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      return {
        ok: false,
        provider: "nvidia",
        model,
        latencyMs,
        error: `NVIDIA API returned HTTP ${response.status}: ${errText.slice(0, 300)}`,
      };
    }

    const data = await response.json();
    const sampleResponse =
      data.choices?.[0]?.message?.content?.trim() ||
      data.choices?.[0]?.message?.reasoning_content?.trim() ||
      "PONG";

    return {
      ok: true,
      provider: "nvidia",
      model,
      latencyMs,
      sampleResponse,
    };
  } catch (err: any) {
    return {
      ok: false,
      provider: "nvidia",
      model,
      latencyMs: Date.now() - startTime,
      error: err.message || "Failed to connect to NVIDIA NIM API",
    };
  }
}

/**
 * Multimodal & text completion helper via NVIDIA NIM (supports vision & reasoning)
 */
export async function generateCompletion(options: GenerateTextOptions): Promise<string> {
  const { apiKey, model, baseUrl, reasoningEffort } = agentConfig.nvidia;
  const invokeUrl = `${baseUrl}/chat/completions`;

  const messages: any[] = [];
  if (options.systemPrompt) {
    messages.push({
      role: "system",
      content: options.systemPrompt,
    });
  }

  // Build multimodal content parts
  const contentParts: ContentPart[] = [
    { type: "text", text: options.prompt },
  ];

  if (options.imageUrls && options.imageUrls.length > 0) {
    for (const url of options.imageUrls) {
      contentParts.push({
        type: "image_url",
        image_url: { url },
      });
    }
  }

  messages.push({
    role: "user",
    content: contentParts,
  });

  const payload = {
    model,
    messages,
    max_tokens: options.maxTokens ?? 16384,
    seed: 0,
    temperature: options.temperature ?? 1,
    reasoning_effort: options.reasoningEffort ?? reasoningEffort ?? "max",
  };

  let lastError: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(invokeUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`NVIDIA NIM API error ${response.status}: ${err}`);
      }

      const data = await response.json();
      return (
        data.choices?.[0]?.message?.content?.trim() ||
        data.choices?.[0]?.message?.reasoning_content?.trim() ||
        ""
      );
    } catch (err: any) {
      lastError = err;
      if (attempt < 3) {
        console.warn(
          `⚠️ [LLM Client] Completion attempt ${attempt} failed (${err.message}). Retrying in ${attempt * 1500}ms...`
        );
        await new Promise((r) => setTimeout(r, attempt * 1500));
      }
    }
  }

  throw lastError || new Error("Failed to generate completion after 3 attempts");
}

/**
 * Generates dense vector embeddings (1024 dimensions) using NVIDIA NIM embeddings API
 * @param text The input string to embed (issue title + description, or problem statement)
 * @param inputType "query" for retrieval searches or "passage" for documents/issues to be indexed
 * @returns Array of 1024 floating point numbers
 */
export async function generateEmbedding(
  text: string,
  inputType: "query" | "passage" = "passage"
): Promise<number[]> {
  const { apiKey, baseUrl, embeddingModel } = agentConfig.nvidia;

  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured in environment");
  }

  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error("Cannot generate embedding for empty text");
  }

  const invokeUrl = `${baseUrl}/embeddings`;
  const bodyPayload = JSON.stringify({
    input: [cleanText],
    model: embeddingModel,
    input_type: inputType,
    dimensions: 1024,
    encoding_format: "float",
  });

  let lastError: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(invokeUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: bodyPayload,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`NVIDIA NIM Embeddings API error ${response.status}: ${err}`);
      }

      const data = await response.json();
      const vector = data?.data?.[0]?.embedding;
      if (!Array.isArray(vector) || vector.length === 0) {
        throw new Error("NVIDIA NIM Embeddings API returned invalid embedding vector format");
      }

      return vector as number[];
    } catch (err: any) {
      lastError = err;
      if (attempt < 3) {
        console.warn(
          `⚠️ [LLM Client] Embedding attempt ${attempt} failed (${err.message}). Retrying in ${attempt * 1000}ms...`
        );
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  }

  throw lastError || new Error("Failed to generate embedding after 3 attempts");
}
