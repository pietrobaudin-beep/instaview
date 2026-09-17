import { getCurrentUser } from "@/lib/auth";
import { ProfileView } from "@/components/profile-view";
import { normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Public result page — no login required, so anyone can try it.
export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const username = normalizeUsername(decodeURIComponent(params.username));
  const user = await getCurrentUser();
  return <ProfileView username={username} loggedIn={!!user} />;
}
