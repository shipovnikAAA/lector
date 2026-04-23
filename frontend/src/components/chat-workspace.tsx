"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type ChatSummary = {
  id: string;
  name: string;
  created_at: string | null;
  is_pinned: boolean;
};

type ChatMessage = {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  created_at: string | null;
  image_url?: string | null;
};

type PendingState = {
  chatId: string | null;
  messageId: string | null;
};

type ChatWorkspaceProps = {
  userName: string;
};

const tools = [
  "Решение задач",
  "Только по учебнику",
  "Пошаговое объяснение",
  "История диалога",
];

function formatTimeLabel(value: string | null) {
  if (!value) {
    return "Сейчас";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Сейчас";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function getPreview(messages: ChatMessage[]) {
  const assistantReply = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const userPrompt = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const source = assistantReply ?? userPrompt;

  if (!source) {
    return "Диалог пуст. Отправьте первый вопрос.";
  }

  return source.content.length > 92
    ? `${source.content.slice(0, 89)}...`
    : source.content;
}

export function ChatWorkspace({ userName }: ChatWorkspaceProps) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedChatIdRef = useRef<string | null>(null);
  const [pendingState, setPendingState] = useState<PendingState>({
    chatId: null,
    messageId: null,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const chatWindowRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const syncChatSummary = useCallback(
    (chatId: string, nextMessages: ChatMessage[], fallbackName?: string) => {
      setChats((current) => {
        const existingChat = current.find((chat) => chat.id === chatId);
        const latestMessage = [...nextMessages]
          .reverse()
          .find((message) => message.role === "user");
        const nextName =
          existingChat?.name ??
          fallbackName ??
          (latestMessage?.content
            ? latestMessage.content.length > 30
              ? `${latestMessage.content.slice(0, 27)}...`
              : latestMessage.content
            : "Новый диалог");
        const nextCreatedAt =
          existingChat?.created_at ??
          nextMessages.find((message) => message.created_at)?.created_at ??
          new Date().toISOString();
        const nextSummary: ChatSummary = {
          created_at: nextCreatedAt,
          id: chatId,
          is_pinned: existingChat?.is_pinned ?? false,
          name: nextName,
        };

        const withoutCurrent = current.filter((chat) => chat.id !== chatId);
        return [nextSummary, ...withoutCurrent];
      });
    },
    [],
  );

  const loadMessages = useCallback(async (chatId: string) => {
    setLoadingMessages(true);

    try {
      const response = await fetch(
        `/api/ai/messages?chatId=${encodeURIComponent(chatId)}`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json()) as {
        messages?: ChatMessage[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось загрузить сообщения.");
      }

      setMessagesByChat((current) => ({
        ...current,
        [chatId]: payload.messages ?? [],
      }));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить сообщения.",
      );
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadChats = useCallback(
    async (preferredChatId?: string | null) => {
      setLoadingChats(true);
      setError(null);

      try {
        const response = await fetch("/api/ai/chats", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          chats?: ChatSummary[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Не удалось загрузить чаты.");
        }

        const nextChats = payload.chats ?? [];
        setChats(nextChats);

        const nextSelectedChatId =
          preferredChatId &&
          nextChats.some((chat) => chat.id === preferredChatId)
            ? preferredChatId
            : selectedChatIdRef.current &&
                nextChats.some((chat) => chat.id === selectedChatIdRef.current)
              ? selectedChatIdRef.current
              : (nextChats[0]?.id ?? null);

        setSelectedChatId(nextSelectedChatId);

        if (nextSelectedChatId) {
          await loadMessages(nextSelectedChatId);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить чаты.",
        );
      } finally {
        setLoadingChats(false);
      }
    },
    [loadMessages],
  );

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  const selectedMessages = useMemo(() => {
    if (!selectedChatId) {
      return [];
    }

    return messagesByChat[selectedChatId] ?? [];
  }, [messagesByChat, selectedChatId]);

  useEffect(() => {
    const chatWindow = chatWindowRef.current;

    if (!chatWindow) {
      return;
    }

    chatWindow.scrollTo({
      behavior: "smooth",
      top: chatWindow.scrollHeight,
    });
  }, [selectedMessages, pendingState]);

  async function handleSelectChat(chatId: string) {
    setSelectedChatId(chatId);

    if (!messagesByChat[chatId]) {
      await loadMessages(chatId);
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const question = draft.trim();

    if (!question || sending) {
      return;
    }

    setSending(true);
    setError(null);

    const optimisticChatId = selectedChatId ?? `pending-${Date.now()}`;
    const optimisticAssistantMessageId = `assistant-pending-${Date.now()}`;
    const optimisticUserMessage: ChatMessage = {
      chat_id: optimisticChatId,
      content: question,
      created_at: new Date().toISOString(),
      id: `user-${Date.now()}`,
      role: "user",
    };
    const optimisticAssistantMessage: ChatMessage = {
      chat_id: optimisticChatId,
      content: "",
      created_at: new Date().toISOString(),
      id: optimisticAssistantMessageId,
      role: "assistant",
    };

    setMessagesByChat((current) => ({
      ...current,
      [optimisticChatId]: [
        ...(current[optimisticChatId] ?? []),
        optimisticUserMessage,
        optimisticAssistantMessage,
      ],
    }));
    syncChatSummary(optimisticChatId, [optimisticUserMessage], "Новый диалог");
    setPendingState({
      chatId: optimisticChatId,
      messageId: optimisticAssistantMessageId,
    });

    if (!selectedChatId) {
      setSelectedChatId(optimisticChatId);
    }

    setDraft("");

    try {
      let imageUrl = null;
      if (selectedImage) {
        const formData = new FormData();
        formData.append("file", selectedImage);
        const uploadRes = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        }
      }

      const response = await fetch("/api/ai/ask", {
        body: JSON.stringify({
          chatId: selectedChatId,
          question,
          image_url: imageUrl,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as {
        answer?: string;
        chat_id?: string;
        error?: string;
      };

      if (!response.ok || !payload.chat_id || !payload.answer) {
        throw new Error(
          payload.error || "Не удалось получить ответ от модели.",
        );
      }

      const finalChatId = payload.chat_id;
      const assistantMessage: ChatMessage = {
        chat_id: finalChatId,
        content: payload.answer,
        created_at: new Date().toISOString(),
        id: `assistant-${Date.now()}`,
        role: "assistant",
      };
      const optimisticMessages = messagesByChat[optimisticChatId] ?? [];
      const normalizedUserMessage = optimisticUserMessage;
      const nextMessages = [
        ...optimisticMessages.filter(
          (message) =>
            message.id !== optimisticUserMessage.id &&
            message.id !== optimisticAssistantMessageId,
        ),
        normalizedUserMessage,
        assistantMessage,
      ];

      setMessagesByChat((current) => ({
        ...current,
        [finalChatId]: nextMessages,
      }));
      syncChatSummary(finalChatId, nextMessages);

      if (optimisticChatId !== finalChatId) {
        setMessagesByChat((current) => {
          const next = { ...current };
          delete next[optimisticChatId];
          return next;
        });
        setChats((current) =>
          current.filter((chat) => chat.id !== optimisticChatId),
        );
      }

      setSelectedChatId(finalChatId);
    } catch (submitError) {
      setDraft(question);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось отправить вопрос.",
      );
      setMessagesByChat((current) => ({
        ...current,
        [optimisticChatId]: (current[optimisticChatId] ?? []).filter(
          (message) =>
            message.id !== optimisticUserMessage.id &&
            message.id !== optimisticAssistantMessageId,
        ),
      }));
    } finally {
      setPendingState({
        chatId: null,
        messageId: null,
      });
      setSending(false);
      setSelectedImage(null);
      setImagePreview(null);
    }
  }

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);

  return (
    <section className="chat-shell">
      <aside className="chat-sidebar">
        <div className="sidebar-card">
          <div className="sidebar-head">
            <div>
              <div className="eyebrow">История</div>
              <h2 className="sidebar-title">Мои чаты</h2>
            </div>
            <button
              className="primary-button compact-button"
              onClick={() => {
                setSelectedChatId(null);
                setDraft("");
                setError(null);
              }}
              type="button"
            >
              Новый чат
            </button>
          </div>

          <div className="chat-history-list">
            {loadingChats ? (
              <div className="history-placeholder">
                Загружаю историю чатов...
              </div>
            ) : chats.length > 0 ? (
              chats.map((chat) => (
                <button
                  className={`history-item ${chat.id === selectedChatId ? "history-item-active" : ""}`}
                  key={chat.id}
                  onClick={() => void handleSelectChat(chat.id)}
                  type="button"
                >
                  <div className="history-item-row">
                    <div className="history-item-title">{chat.name}</div>
                    <span className="history-item-time">
                      {formatTimeLabel(chat.created_at)}
                    </span>
                  </div>
                  <p className="history-item-preview">
                    {getPreview(messagesByChat[chat.id] ?? [])}
                  </p>
                </button>
              ))
            ) : (
              <div className="history-placeholder">
                Пока нет диалогов. Начните новый чат.
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-card">
          <div className="eyebrow">Профиль</div>
          <div className="profile-strip">
            <div className="profile-strip-meta">
              <div className="profile-strip-name">{userName}</div>
              <div className="profile-strip-email">Доступ к чату активен</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="chat-main">
        <div className="chat-topbar">
          <div>
            <div className="eyebrow">Текущий диалог</div>
            <h1 className="chat-title">
              {selectedChat?.name ?? "Новый диалог"}
            </h1>
          </div>
          <div className="chat-tools">
            {tools.map((tool) => (
              <span className="signal-chip" key={tool}>
                {tool}
              </span>
            ))}
          </div>
        </div>

        <div className="chat-window" ref={chatWindowRef}>
          {error ? (
            <div className="error-box chat-status-box">{error}</div>
          ) : null}

          {loadingMessages ? (
            <div className="chat-empty-state">Загружаю сообщения...</div>
          ) : selectedMessages.length > 0 ? (
            selectedMessages.map((message) => (
              <article
                className={`chat-bubble ${
                  message.role === "assistant"
                    ? "chat-bubble-assistant"
                    : "chat-bubble-user"
                }`}
                key={message.id}
              >
                <div className="chat-bubble-title">
                  {message.role === "assistant" ? "Lector" : "Вы"}
                </div>
                {message.id === pendingState.messageId &&
                pendingState.chatId === selectedChatId ? (
                  <div className="chat-thinking-shell" aria-live="polite">
                    <div className="chat-thinking" role="status">
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                      <span>Лектор думает...</span>
                    </div>
                    <div className="chat-thinking-skeleton" aria-hidden="true">
                      <span className="thinking-line thinking-line-wide" />
                      <span className="thinking-line thinking-line-medium" />
                      <span className="thinking-line thinking-line-short" />
                    </div>
                  </div>
                ) : (
                  <>
                    {message.image_url && (
                      <div className="chat-image-preview">
                        <img src={message.image_url} alt="Прикрепленное фото" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '8px' }} />
                      </div>
                    )}
                    <div className="chat-content-markdown">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </>
                )}
              </article>
            ))
          ) : (
            <div className="chat-empty-state">
              Задайте вопрос по учебнику, конспекту или задаче, и Lector ответит
              в этом окне.
            </div>
          )}
        </div>

        <div className="composer-panel">
          <div className="composer-toolbar">
            <span className="composer-mode">Режим: чат с AI-сервисом</span>
            {/* <span className="composer-note">Ответы приходят из backend `ai`, а не из mock-разметки</span> */}
          </div>

          <form className="composer-form" onSubmit={handleSubmit}>
            <textarea
              className="composer-input"
              name="prompt"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  // Вызываем handleSubmit вручную, передавая синтетическое событие или просто вызывая логику
                  // В нашем случае handleSubmit ожидает FormEvent<HTMLFormElement>. 
                  // Но мы можем вынести логику отправки в отдельную функцию.
                  void (event.currentTarget.form as HTMLFormElement).requestSubmit();
                }
              }}
              placeholder="Введите вопрос по физике, фрагмент задачи, условие или цитату из учебника..."
              rows={imagePreview ? 2 : 5}
              value={draft}
            />
            {imagePreview && (
              <div className="composer-image-preview">
                <img src={imagePreview} alt="Preview" />
                <button type="button" onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="remove-image">&times;</button>
              </div>
            )}
            <div className="composer-actions">
              <div className="composer-attachments">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="ghost-button compact-button">
                  📷 Фото
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*" 
                  onChange={handleImageChange}
                />
              </div>
              <span className="composer-hint">
                {selectedChatId
                  ? "Ответ продолжит текущий диалог."
                  : "Первый вопрос создаст новый чат."}
              </span>
              <button
                className="primary-button compact-button"
                disabled={sending}
                type="submit"
              >
                {sending ? "Думаю..." : "Отправить"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
