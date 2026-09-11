import { ProfileView } from "@/components/profile-view";
import { normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Public result page — no login required, so anyone can try it.
export default function PublicProfilePage({ params }: { params: { username: string } }) {
  const username = normalizeUsername(decodeURIComponent(params.username));
  return <ProfileView username={username} />;
}
