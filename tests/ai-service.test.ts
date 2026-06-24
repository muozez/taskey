import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractJson, generateTasks, testConnection, decomposeSingleTask, analyzeProject } from "../src/ai/ai-service";

// Mock OpenAI
vi.mock("openai", () => {
  const mockOpenaiCreate = vi.fn().mockImplementation((args: any) => {
    // If it's a connection test error case
    if (args.model === "gpt-error-model") {
      return Promise.reject(new Error("API Key Invalid"));
    }
    // If the ping mock is called
    if (args.messages && args.messages[0] && args.messages[0].content === "Ping") {
      return Promise.resolve({
        choices: [{ message: { content: "Pong" } }]
      });
    }
    // If it is a project analysis/audit prompt
    if (args.messages && args.messages[0] && args.messages[0].content.includes("Proje Adı:")) {
      return Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify({
                contextScore: 85,
                generalSummary: "Genel proje özeti.",
                recommendations: [
                  { title: "İyileştirme", desc: "Açıklama" }
                ],
                workflowOptimization: "İş akışı önerisi."
              })
            }
          }
        ]
      });
    }
    // If it is a single task decomposition prompt
    if (args.messages && args.messages[0] && args.messages[0].content.includes("Büyük Görev:")) {
      return Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tasks: [
                  {
                    title: "Micro Task 1",
                    description: "Micro Desc 1",
                    priority: "low",
                    estimatedDays: 1,
                    startDate: "2026-06-24",
                    dueDate: "2026-06-25",
                    tags: ["micro"],
                    status: "in-progress"
                  }
                ]
              })
            }
          }
        ]
      });
    }
    // Otherwise return success task list
    return Promise.resolve({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: "Test summary",
              logicAnalysis: "Logical analysis advice",
              tasks: [
                {
                  title: "Test Task",
                  description: "Test Desc",
                  priority: "high",
                  estimatedDays: 2,
                  startDate: "2026-06-24",
                  dueDate: "2026-06-26",
                  tags: ["test"],
                  status: "backlog"
                }
              ]
            })
          }
        }
      ]
    });
  });

  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockOpenaiCreate
        }
      };
    }
  };
});

// Mock Anthropic
vi.mock("@anthropic-ai/sdk", () => {
  const mockAnthropicCreate = vi.fn().mockResolvedValue({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          summary: "Anthropic summary",
          tasks: []
        })
      }
    ]
  });

  return {
    default: class MockAnthropic {
      messages = {
        create: mockAnthropicCreate
      };
    }
  };
});

// Mock Gemini
vi.mock("@google/generative-ai", () => {
  const mockGeminiGenerate = vi.fn().mockResolvedValue({
    response: {
      text: () => JSON.stringify({
        summary: "Gemini summary",
        tasks: []
      })
    }
  });

  return {
    GoogleGenerativeAI: class MockGoogleGenerativeAI {
      getGenerativeModel() {
        return {
          generateContent: mockGeminiGenerate
        };
      }
    }
  };
});

describe("ai-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractJson", () => {
    it("should parse direct JSON string", () => {
      const input = '{"a": 1}';
      expect(extractJson(input)).toEqual({ a: 1 });
    });

    it("should parse JSON in markdown code blocks", () => {
      const input = "```json\n{\"a\": 2}\n```";
      expect(extractJson(input)).toEqual({ a: 2 });
    });

    it("should parse JSON inside surrounding text", () => {
      const input = "Here is the response: {\"a\": 3} and some extra text.";
      expect(extractJson(input)).toEqual({ a: 3 });
    });

    it("should throw error on invalid JSON", () => {
      const input = "not a json";
      expect(() => extractJson(input)).toThrow("JSON formatında yanıt elde edilemedi");
    });
  });

  describe("generateTasks", () => {
    it("should successfully generate tasks via OpenAI", async () => {
      const payload = {
        projectId: "proj-1",
        provider: "openai" as const,
        apiKey: "sk-test",
        model: "gpt-4o",
        taskScope: "scope",
        expectedOutcome: "outcome",
        startDate: "2026-06-24",
        endDate: "2026-06-30"
      };

      const result = await generateTasks(payload, "system prompt");
      expect(result.summary).toBe("Test summary");
      expect(result.logicAnalysis).toBe("Logical analysis advice");
      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0].title).toBe("Test Task");
      expect(result.tasks[0].priority).toBe("high");
    });
  });

  describe("decomposeSingleTask", () => {
    it("should successfully decompose single task into micro-tasks via OpenAI", async () => {
      const payload = {
        provider: "openai" as const,
        apiKey: "sk-test",
        model: "gpt-4o",
        title: "Büyük Görev",
        description: "Büyük Açıklama",
        startDate: "2026-06-24",
        dueDate: "2026-06-30",
        status: "backlog",
        tags: ["test"]
      };

      const result = await decomposeSingleTask(payload);
      expect(result.length).toBe(1);
      expect(result[0].title).toBe("Micro Task 1");
      expect(result[0].priority).toBe("low");
      expect(result[0].status).toBe("in-progress");
    });
  });

  describe("analyzeProject", () => {
    it("should successfully audit project tasks via OpenAI", async () => {
      const payload = {
        projectId: "proj-1",
        provider: "openai" as const,
        apiKey: "sk-test",
        model: "gpt-4o",
        taskScope: "",
        expectedOutcome: "",
        startDate: "",
        endDate: ""
      };

      const result = await analyzeProject(payload, "Proje Adı: Test");
      expect(result.contextScore).toBe(85);
      expect(result.generalSummary).toBe("Genel proje özeti.");
      expect(result.workflowOptimization).toBe("İş akışı önerisi.");
      expect(result.recommendations.length).toBe(1);
      expect(result.recommendations[0].title).toBe("İyileştirme");
    });
  });

  describe("testConnection", () => {
    it("should return success: true for verified credentials", async () => {
      const res = await testConnection("openai", "sk-test", "gpt-4o");
      expect(res.success).toBe(true);
    });

    it("should return success: false when provider raises exception", async () => {
      const res = await testConnection("openai", "invalid-key", "gpt-error-model");
      expect(res.success).toBe(false);
      expect(res.message).toContain("API Key Invalid");
    });
  });
});
