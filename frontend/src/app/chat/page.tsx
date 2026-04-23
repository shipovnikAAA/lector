import { redirect } from "next/navigation";

import { ChatWorkspace } from "@/components/chat-workspace";
import { Header } from "@/components/header";
import { getCurrentProfile, getCurrentUser, syncProfileFromUser } from "@/lib/profile";

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
      <ChatWorkspace userName={profile.full_name ?? profile.email ?? "Пользователь"} />
    </main>
  );
}
