import { getCurrentUser } from "@/lib/profile";

const DEFAULT_AI_URL = "http://127.0.0.1:6969";

export type AiChat = {
  id: string;
  user_id: string;
  name: string;
  is_pinned: boolean;
  created_at: string | null;
};

export type AiMessage = {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | string;
  content: string;
  created_at: string | null;
};

type AuthResponse = {
  token: string;
};

type AskResponse = {
  chat_id: string;
  answer: string;
};

function getAiBaseUrl() {
  return process.env.LECTOR_AI_URL?.trim() || DEFAULT_AI_URL;
}

function buildAiCredentials(userId: string) {
  const secret = process.env.LECTOR_AI_SHARED_SECRET?.trim() || "local-dev-ai-secret";

  return {
    username: `supabase_${userId}`,
    password: `${userId}:${secret}`
  };
}

async function aiFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${getAiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  return response;
}

async function ensureAiToken() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const credentials = buildAiCredentials(user.id);

  const loginResponse = await aiFetch("/login", {
    body: JSON.stringify(credentials),
    method: "POST"
  });

  if (loginResponse.ok) {
    const payload = (await loginResponse.json()) as AuthResponse;
    return payload.token;
  }

  const registerResponse = await aiFetch("/register", {
    body: JSON.stringify(credentials),
    method: "POST"
  });

  if (registerResponse.ok) {
    const payload = (await registerResponse.json()) as AuthResponse;
    return payload.token;
  }

  if (registerResponse.status === 409) {
    const retryLoginResponse = await aiFetch("/login", {
      body: JSON.stringify(credentials),
      method: "POST"
    });

    if (retryLoginResponse.ok) {
      const payload = (await retryLoginResponse.json()) as AuthResponse;
      return payload.token;
    }

    throw new Error(await readAiError(retryLoginResponse));
  }

  throw new Error(await readAiError(registerResponse));
}

async function readAiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    return payload.error || payload.message || `AI service error (${response.status})`;
  } catch {
    return `AI service error (${response.status})`;
  }
}

export async function listAiChats() {
  const token = await ensureAiToken();
  const response = await aiFetch("/chat", {
    headers: {
      Authorization: `Bearer ${token}`
    },
    method: "GET"
  });

  if (!response.ok) {
    throw new Error(await readAiError(response));
  }

  return (await response.json()) as AiChat[];
}

export async function listAiMessages(chatId: string) {
  const token = await ensureAiToken();
  const response = await aiFetch(`/chat/${chatId}/messages`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    method: "GET"
  });

  if (!response.ok) {
    throw new Error(await readAiError(response));
  }

  return (await response.json()) as AiMessage[];
}

export async function askAi(question: string, chatId?: string | null) {
  const token = await ensureAiToken();
  const response = await aiFetch("/ask", {
    body: JSON.stringify({
      chat_id: chatId ?? null,
      question
    }),
    headers: {
      Authorization: `Bearer ${token}`
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readAiError(response));
  }

  return (await response.json()) as AskResponse;
}
