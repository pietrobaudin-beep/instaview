import { LegalPage } from "@/components/legal-page";
import { PRIVACIDADE } from "@/lib/legal";

export const metadata = {
  title: "Política de Privacidade · Farejo",
  description: "Que dados o Farejo trata, para quê, por quanto tempo e quais são os seus direitos.",
};

export default function PrivacidadePage() {
  return <LegalPage doc={PRIVACIDADE} outro={{ href: "/termos", label: "Ler os Termos de Uso →" }} />;
}
