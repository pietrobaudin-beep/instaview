import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { DevLogin } from "@/components/dev-login";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
      {/* Test-account shortcuts, never shipped to the live site. */}
      {process.env.NODE_ENV !== "production" && <DevLogin />}
    </Suspense>
  );
}
