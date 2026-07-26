// NVIDIA NIM client — chosen per the plan discussion, using meta/llama-3.1-8b-instruct
// specifically because NVIDIA explicitly documents tool-calling support for that
// model (not all NIM-hosted models are trained for it), needed for the Copilot.

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "meta/llama-3.1-8b-instruct";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
}

interface ChatCompletionResponse {
  choices: {
    message: {
      content: string | null;
      tool_calls?: {
        id: string;
        function: { name: string; arguments: string };
      }[];
    };
  }[];
}

export async function nvidiaChat(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; tools?: unknown[] } = {},
): Promise<ChatCompletionResponse["choices"][0]["message"]> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY not set");

  const res = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: opts.maxTokens ?? 300,
      temperature: opts.temperature ?? 0.2,
      ...(opts.tools ? { tools: opts.tools, tool_choice: "auto" } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NVIDIA error ${res.status}: ${text}`);
  }

  const data: ChatCompletionResponse = await res.json();
  return data.choices[0].message;
}

export function isAiConfigured(): boolean {
  return !!process.env.NVIDIA_API_KEY;
}
