import { Onboarding } from "@/components/onboarding";
import { safeNext } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bem-vindo · Farejo", description: "Descubra mais do Instagram com o Farejo." };

export default function OnboardingPage({ searchParams }: { searchParams: { next?: string } }) {
  return <Onboarding next={safeNext(searchParams.next) ?? "/"} />;
}
