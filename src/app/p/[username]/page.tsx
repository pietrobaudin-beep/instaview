import { getCurrentUser } from "@/lib/auth";
import { ProfileView } from "@/components/profile-view";
import { direitosDe } from "@/lib/direitos";
import { normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Public result page — no login required, so anyone can try it.
export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const username = normalizeUsername(decodeURIComponent(params.username));
  const user = await getCurrentUser();
  // O plano vem da sessão, aqui no servidor. Ter plano não revela perfil
  // nenhum sozinho — quem revela é a análise consumida —, mas decide o que a
  // tela oferece: análise, revelação grátis ou Farejador.
  const d = direitosDe(user);
  return (
    <ProfileView
      username={username}
      loggedIn={!!user}
      planoPro={!!user && (d.admin || d.plano !== "FREE")}
      temFaro={d.admin || d.config.maxProfiles > 0}
    />
  );
}
