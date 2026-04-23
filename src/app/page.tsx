import Link from "next/link";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Header } from "@/components/header";
import { getCurrentUser } from "@/lib/profile";

const featureCards = [
  {
    title: "Пошаговые решения",
    text: "Бот раскладывает задачу на физические шаги, а не ограничивается коротким ответом."
  },
  {
    title: "Учебный фокус",
    text: "Подходит для школьной физики, базовых вузовских тем и аккуратного разбора формул."
  },
  {
    title: "Будущий chat workflow",
    text: "История диалогов, загрузка фото, режимы объяснения и персональный кабинет уже подготовлены."
  }
];

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  const { error } = await searchParams;

  return (
    <main className="page-shell">
      <Header />

      <section className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow">ИИ-решатель задач по физике</div>
          <h1>Объясняет решение, а не просто пишет ответ.</h1>
          <p className="hero-text">
            Сервис для учеников и студентов: вставляешь условие, получаешь
            формулы, вычисления, пояснения и ясную логику переходов между
            шагами. Интерфейс чата и история уже готовы, API модели можно
            подключить следующим этапом.
          </p>

          {error ? (
            <p className="alert-box">Ошибка авторизации: {error}</p>
          ) : null}

          <div className="hero-actions">
            {user ? (
              <Link className="button primary-button" href="/chat">
                Открыть чат
              </Link>
            ) : (
              <GoogleSignInButton />
            )}
            <a className="button ghost-button" href="#features">
              Посмотреть возможности
            </a>
          </div>

          <div className="hero-badges">
            <span className="signal-chip">Разбор по шагам</span>
            <span className="signal-chip">Проверка единиц</span>
            <span className="signal-chip">Подготовка к экзаменам</span>
          </div>
        </div>

        <div className="demo-panel">
          <div className="demo-header">
            <span className="demo-title">Демо-диалог</span>
            <span className="demo-status">Physics reasoning mode</span>
          </div>

          <div className="message-thread">
            <article className="message-card user-message">
              <div className="message-role">Ученик</div>
              <p>
                Тело массой 2 кг тянут по горизонтали силой 12 Н. Коэффициент
                трения 0,2. Найти ускорение.
              </p>
            </article>

            <article className="message-card bot-message">
              <div className="message-role">ФизБот</div>
              <p>
                Сначала определим силы вдоль движения. Затем найдём силу трения,
                вычтем её из силы тяги и разделим результат на массу.
              </p>
              <div className="formula-block">
                F<sub>тр</sub> = μmg = 0,2 · 2 · 9,8 ≈ 3,92 Н
              </div>
              <div className="formula-block">
                a = (F - F<sub>тр</sub>) / m = (12 - 3,92) / 2 ≈ 4,04 м/с
                <sup>2</sup>
              </div>
            </article>
          </div>

          <div className="prompt-shell">
            <span className="prompt-hint">Следующий шаг: подключение API модели</span>
            <div className="prompt-line">
              <span className="prompt-placeholder">
                Вставьте условие задачи, фото или формулу...
              </span>
              <span className="prompt-send">Решить</span>
            </div>
          </div>
        </div>
      </section>

      <section className="info-grid" id="features">
        {featureCards.map((card) => (
          <article className="info-card" key={card.title}>
            <div className="info-card-title">{card.title}</div>
            <p>{card.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
