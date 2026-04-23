import Image from "next/image";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AccountNameEditor } from "@/components/account-name-editor";
import { Header } from "@/components/header";
import { getCurrentProfile, getCurrentUser, syncProfileFromUser } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

const plans = [
  {
    current: true,
    name: "Free",
    price: "0 ₽",
    description: "Для знакомства с продуктом и первых задач.",
    points: ["Ограниченное число запросов", "Базовые объяснения", "История чатов"]
  },
  {
    current: false,
    name: "Student",
    price: "399 ₽ / мес",
    description: "Для регулярной учёбы и домашних заданий.",
    points: ["Больше решений в месяц", "Пошаговые объяснения", "Приоритетная обработка"]
  },
  {
    current: false,
    name: "Pro",
    price: "799 ₽ / мес",
    description: "Для интенсивной подготовки и сложных тем.",
    points: ["Расширенные лимиты", "Подробные разборы", "Будущие премиум-режимы"]
  }
];

async function updateProfileName(formData: FormData) {
  "use server";

  const rawName = formData.get("full_name");
  const fullName = typeof rawName === "string" ? rawName.trim() : "";

  if (!fullName) {
    redirect("/dashboard?error=empty_name");
  }

  if (fullName.length > 80) {
    redirect("/dashboard?error=name_too_long");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName
    })
    .eq("id", user.id);

  if (error) {
    redirect("/dashboard?error=save_failed");
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?saved=1");
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const existingProfile = await getCurrentProfile();
  const profile = existingProfile ?? (await syncProfileFromUser());

  if (!profile) {
    redirect("/?error=profile_sync_failed");
  }

  const { error, saved } = await searchParams;

  return (
    <main className="page-shell">
      <Header />

      <section className="account-shell">
        <div className="account-card">
          <div className="eyebrow">Личный кабинет</div>
          <h1 className="account-title">Профиль пользователя</h1>

          {saved ? <p className="status-box success-box">Имя сохранено.</p> : null}
          {error ? (
            <p className="status-box error-box">
              {error === "empty_name"
                ? "Имя не может быть пустым."
                : error === "name_too_long"
                  ? "Имя слишком длинное."
                  : "Не удалось сохранить имя."}
            </p>
          ) : null}

          <div className="account-profile">
            {profile.avatar_url ? (
              <Image
                alt={profile.full_name ?? "Профиль"}
                className="account-avatar"
                height={112}
                priority
                src={profile.avatar_url}
                width={112}
              />
            ) : (
              <div className="account-avatar account-avatar-fallback">
                {(profile.full_name ?? "U").slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="account-details">
              <AccountNameEditor
                action={updateProfileName}
                initialName={profile.full_name ?? ""}
              />

              <div className="account-field">
                <span className="account-label">Почта</span>
                <span className="account-value">{profile.email ?? "Не указана"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="account-card">
          <div className="eyebrow">Подписка</div>
          <h2 className="account-section-title">Выберите план</h2>
          <p className="section-text">
            Пока это только интерфейс. Подключение оплаты и реальной смены плана
            можно сделать позже.
          </p>

          <div className="plan-grid">
            {plans.map((plan) => (
              <article
                className={`plan-card ${plan.current ? "plan-card-current" : ""}`}
                key={plan.name}
              >
                <div className="plan-head">
                  <div className="plan-name">{plan.name}</div>
                  {plan.current ? <span className="plan-badge">Текущий план</span> : null}
                </div>
                <div className="plan-price">{plan.price}</div>
                <p className="plan-description">{plan.description}</p>
                <div className="plan-points">
                  {plan.points.map((point) => (
                    <div className="plan-point" key={point}>
                      {point}
                    </div>
                  ))}
                </div>
                <button
                  className={`${plan.current ? "primary-button" : "ghost-button"} wide-button`}
                  disabled
                  type="button"
                >
                  {plan.current ? "Выбран по умолчанию" : "Скоро будет доступно"}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
