import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildSingleTaskDecompositionPrompt } from "./prompt-builder";

export interface GeneratedTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedDays: number;
  startDate: string;   // ISO (YYYY-MM-DD)
  dueDate: string;     // ISO (YYYY-MM-DD)
  tags: string[];
  status: string;      // kanban column id
}

export interface AiTaskResult {
  tasks: GeneratedTask[];
  summary: string;
  logicAnalysis?: string;
}

export interface AiGeneratePayload {
  projectId: string;
  provider: "gemini" | "openai" | "anthropic";
  apiKey: string;
  model: string;
  taskScope: string;
  expectedOutcome: string;
  startDate: string;   // ISO
  endDate: string;     // ISO
}

/**
 * Extracts and parses JSON from raw LLM text response.
 * Handles markdown code blocks and loose formatting.
 */
export function extractJson(text: string): any {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // Ignore direct parse error, try block extraction
  }

  // Look for markdown code block
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      // Ignore
    }
  }

  // Fallback: search for first { and last }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      // Ignore
    }
  }

  throw new Error("JSON formatında yanıt elde edilemedi: " + text.slice(0, 150) + "...");
}

/**
 * Retries an async function with exponential backoff.
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 2, delay = 1000): Promise<T> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      attempt++;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  throw new Error("Retry failed");
}

/**
 * Performs raw AI request using the specified provider.
 */
async function performRequest(payload: AiGeneratePayload, prompt: string): Promise<string> {
  const { provider, apiKey, model } = payload;

  if (provider === "openai") {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    return response.choices[0]?.message?.content || "";
  } else if (provider === "gemini") {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelInstance = genAI.getGenerativeModel({
      model: model,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    const result = await modelInstance.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } else if (provider === "anthropic") {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }]
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  } else {
    throw new Error(`Geçersiz sağlayıcı: ${provider}`);
  }
}

export async function generateTasks(payload: AiGeneratePayload, prompt: string): Promise<AiTaskResult> {
  let currentPrompt = prompt;
  let attempt = 0;
  const maxRetries = 2;
  const delay = 1000;

  while (attempt <= maxRetries) {
    try {
      const rawResponse = await performRequest(payload, currentPrompt);
      const parsed = extractJson(rawResponse);

      if (!parsed || !Array.isArray(parsed.tasks)) {
        throw new Error("AI yanıtı beklenen şemaya uymuyor (tasks dizisi bulunamadı)");
      }

      const tasks: GeneratedTask[] = parsed.tasks.map((t: any) => {
        const priority = (t.priority || "medium").toLowerCase();
        const validPriority = ["low", "medium", "high", "urgent"].includes(priority)
          ? (priority as "low" | "medium" | "high" | "urgent")
          : "medium";

        return {
          title: String(t.title || "İsimsiz Görev").trim(),
          description: String(t.description || "").trim(),
          priority: validPriority,
          estimatedDays: Number(t.estimatedDays) || 1,
          startDate: String(t.startDate || payload.startDate).trim(),
          dueDate: String(t.dueDate || payload.endDate).trim(),
          tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
          status: String(t.status || "backlog").trim()
        };
      });

      return {
        tasks,
        summary: String(parsed.summary || ""),
        logicAnalysis: parsed.logicAnalysis ? String(parsed.logicAnalysis) : undefined
      };
    } catch (err: any) {
      if (attempt === maxRetries) {
        throw err;
      }
      attempt++;

      // If it is a JSON or schema validation error, we provide direct feedback to the AI for the retry
      if (err.message && (err.message.includes("JSON") || err.message.includes("şemaya uymuyor"))) {
        currentPrompt = `${prompt}\n\nÖNEMLİ UYARI: Önceki denemede geçersiz JSON ürettin veya JSON yapısı şemaya uymadı. Lütfen SADECE geçerli ve düzgün biçimlendirilmiş bir JSON objesi döndürdüğünden emin ol. Hata detayı: ${err.message}`;
      }

      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  throw new Error("Retry failed");
}

/**
 * Tests connection to the AI provider.
 */
export async function testConnection(
  provider: string,
  apiKey: string,
  model: string
): Promise<{ success: boolean; message?: string }> {
  try {
    if (provider === "openai") {
      const openai = new OpenAI({ apiKey });
      await openai.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: "Ping" }],
        max_tokens: 5
      });
    } else if (provider === "gemini") {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelInstance = genAI.getGenerativeModel({ model: model });
      const result = await modelInstance.generateContent("Ping");
      await result.response;
    } else if (provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey });
      await anthropic.messages.create({
        model: model,
        max_tokens: 5,
        messages: [{ role: "user", content: "Ping" }]
      });
    } else {
      return { success: false, message: `Desteklenmeyen sağlayıcı: ${provider}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || String(err) };
  }
}

export interface DecomposeSingleTaskPayload {
  provider: "gemini" | "openai" | "anthropic";
  apiKey: string;
  model: string;
  title: string;
  description: string;
  startDate: string;
  dueDate: string;
  status: string;
  tags: string[];
}

export async function decomposeSingleTask(payload: DecomposeSingleTaskPayload): Promise<GeneratedTask[]> {
  const prompt = buildSingleTaskDecompositionPrompt({
    title: payload.title,
    description: payload.description,
    startDate: payload.startDate,
    dueDate: payload.dueDate
  });

  const rawPayload: AiGeneratePayload = {
    projectId: '',
    provider: payload.provider,
    apiKey: payload.apiKey,
    model: payload.model,
    taskScope: payload.description,
    expectedOutcome: '',
    startDate: payload.startDate,
    endDate: payload.dueDate
  };

  let currentPrompt = prompt;
  let attempt = 0;
  const maxRetries = 2;
  const delay = 1000;

  while (attempt <= maxRetries) {
    try {
      const rawResponse = await performRequest(rawPayload, currentPrompt);
      const parsed = extractJson(rawResponse);

      if (!parsed || !Array.isArray(parsed.tasks)) {
        throw new Error("AI yanıtı beklenen şemaya uymuyor (tasks dizisi bulunamadı)");
      }

      return parsed.tasks.map((t: any) => {
        const priority = (t.priority || "medium").toLowerCase();
        const validPriority = ["low", "medium", "high", "urgent"].includes(priority)
          ? (priority as "low" | "medium" | "high" | "urgent")
          : "medium";

        return {
          title: String(t.title || "İsimsiz Mikro Görev").trim(),
          description: String(t.description || "").trim(),
          priority: validPriority,
          estimatedDays: Number(t.estimatedDays) || 1,
          startDate: String(t.startDate || payload.startDate).trim(),
          dueDate: String(t.dueDate || payload.dueDate).trim(),
          tags: Array.isArray(t.tags) ? t.tags.map(String) : payload.tags,
          status: String(t.status || payload.status).trim()
        };
      });
    } catch (err: any) {
      if (attempt === maxRetries) {
        throw err;
      }
      attempt++;
      if (err.message && (err.message.includes("JSON") || err.message.includes("şemaya uymuyor"))) {
        currentPrompt = `${prompt}\n\nÖNEMLİ UYARI: Önceki denemede geçersiz JSON ürettin veya JSON yapısı şemaya uymadı. Lütfen SADECE geçerli ve düzgün biçimlendirilmiş bir JSON objesi döndürdüğünden emin ol. Hata detayı: ${err.message}`;
      }
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  throw new Error("Retry failed");
}
