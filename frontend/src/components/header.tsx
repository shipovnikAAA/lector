import Link from "next/link";

import { getCurrentUser } from "@/lib/profile";

import { GoogleSignInButton } from "./google-sign-in-button";
import { LogoutForm } from "./logout-form";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">Physics AI Studio</span>
        <span className="brand-title">ФизБот</span>
      </Link>
      <div className="topbar-actions">
        <Link className="button ghost-button" href="/#features">
          Возможности
        </Link>
        <Link className="button ghost-button" href="/chat">
          Чат
        </Link>
        <Link className="button ghost-button" href="/formulas">
          Формулы
        </Link>
        {user ? (
          <>
            <Link className="button ghost-button" href="/dashboard">
              Кабинет
            </Link>
            <LogoutForm />
          </>
        ) : (
          <GoogleSignInButton />
        )}
      </div>
    </header>
  );
}
