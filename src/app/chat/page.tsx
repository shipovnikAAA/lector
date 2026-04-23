import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Header } from "@/components/header";
import { getCurrentProfile, getCurrentUser, syncProfileFromUser } from "@/lib/profile";

const chatHistory = [
  {
    id: "inclined-plane",
    title: "Наклонная плоскость",
    preview: "Силы, проекции, трение и ускорение тела.",
    updatedAt: "2 мин назад",
    active: true
  },
  {
    id: "electric-circuit",
    title: "Электрическая цепь",
    preview: "Разбор закона Ома и последовательного соединения.",
    updatedAt: "23 мин назад",
    active: false
  },
  {
    id: "gas-law",
    title: "Газовый процесс",
    preview: "Изобарный нагрев и работа газа.",
    updatedAt: "Вчера",
    active: false
  }
];

const tools = [
  "Фото условия",
  "Формулы и символы",
  "Оформление как в тетради",
  "Проверка единиц"
];

export default async function ChatPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const existingProfile = await getCurrentProfile();
  const profile = existingProfile ?? (await syncProfileFromUser());

  if (!profile) {
    redirect("/?error=profile_sync_failed");
  }

  return (
    <main className="page-shell">
      <Header />

      <section className="chat-shell">
        <aside className="chat-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-head">
              <div>
                <div className="eyebrow">История</div>
                <h2 className="sidebar-title">Мои чаты</h2>
              </div>
              <button className="primary-button compact-button" type="button">
                Новый чат
              </button>
            </div>

            <div className="chat-history-list">
              {chatHistory.map((chat) => (
                <article
                  className={`history-item ${chat.active ? "history-item-active" : ""}`}
                  key={chat.id}
                >
                  <div className="history-item-row">
                    <div className="history-item-title">{chat.title}</div>
                    <span className="history-item-time">{chat.updatedAt}</span>
                  </div>
                  <p className="history-item-preview">{chat.preview}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="sidebar-card">
            <div className="eyebrow">Профиль</div>
            <div className="profile-strip">
              {profile.avatar_url ? (
                <Image
                  alt={profile.full_name ?? "Профиль"}
                  className="profile-strip-avatar"
                  height={56}
                  src={profile.avatar_url}
                  width={56}
                />
              ) : null}
              <div className="profile-strip-meta">
                <div className="profile-strip-name">{profile.full_name ?? "Пользователь"}</div>
                <div className="profile-strip-email">{profile.email ?? "Нет email"}</div>
              </div>
            </div>
            <Link className="button ghost-button wide-button" href="/dashboard">
              Открыть кабинет
            </Link>
          </div>
        </aside>

        <div className="chat-main">
          <div className="chat-topbar">
            <div>
              <div className="eyebrow">Текущий диалог</div>
              <h1 className="chat-title">Наклонная плоскость</h1>
            </div>
            <div className="chat-tools">
              {tools.map((tool) => (
                <span className="signal-chip" key={tool}>
                  {tool}
                </span>
              ))}
            </div>
          </div>

          <div className="chat-window">
            <article className="chat-bubble chat-bubble-user">
              <div className="chat-bubble-title">Условие</div>
              <p>
                Брусок массой 3 кг скользит по наклонной плоскости под углом
                30°. Коэффициент трения 0,1. Найти ускорение бруска.
              </p>
            </article>

            <article className="chat-bubble chat-bubble-assistant">
              <div className="chat-bubble-title">Разбор</div>
              <p>
                Выбираю ось вдоль плоскости. Вдоль неё действуют две силы:
                составляющая тяжести вниз и сила трения вверх.
              </p>
              <div className="formula-block">
                a = g(sin α - μcos α)
              </div>
            </article>

            <article className="chat-bubble chat-bubble-assistant">
              <div className="chat-bubble-title">Вычисление</div>
              <div className="formula-block">
                a = 9,8 · (0,5 - 0,1 · 0,866) ≈ 9,8 · 0,4134 ≈ 4,05 м/с
                <sup>2</sup>
              </div>
            </article>

            <article className="chat-bubble chat-bubble-assistant">
              <div className="chat-bubble-title">Ответ</div>
              <p>
                Ускорение бруска примерно равно 4,05 м/с<sup>2</sup> вниз вдоль
                наклонной плоскости.
              </p>
            </article>
          </div>

          <div className="composer-panel">
            <div className="composer-toolbar">
              <span className="composer-mode">Режим: пошаговое объяснение</span>
              <span className="composer-note">API модели подключится сюда позже</span>
            </div>

            <form className="composer-form">
              <textarea
                className="composer-input"
                defaultValue=""
                name="prompt"
                placeholder="Вставьте условие задачи по физике, формулы, данные эксперимента или текст из учебника..."
                rows={5}
              />
              <div className="composer-actions">
                <button className="ghost-button compact-button" type="button">
                  Прикрепить фото
                </button>
                <button className="primary-button compact-button" type="submit">
                  Решить задачу
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
