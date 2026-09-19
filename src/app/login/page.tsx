import { Suspense } from "react";
import { CodeLogin } from "@/components/code-login";
import { DevLogin } from "@/components/dev-login";
import { availableChannels } from "@/lib/login-code/senders";

export const dynamic = "force-dynamic";

export const metadata = { title: "Entrar · Farejo", description: "Entre no Farejo com um código, sem senha." };

export default function LoginPage() {
  return (
    <Suspense>
      <CodeLogin channels={availableChannels()} />
      {/* Test-account shortcuts, never shipped to the live site. */}
      {process.env.NODE_ENV !== "production" && <DevLogin />}
    </Suspense>
  );
}
