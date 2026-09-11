import { redirect } from "next/navigation";
import { ConnectClient } from "@/components/connect-client";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <ConnectClient />;
}
