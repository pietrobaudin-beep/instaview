import { LegalPage } from "@/components/legal-page";
import { TERMOS } from "@/lib/legal";

export const metadata = {
  title: "Termos de Uso · Farejo",
  description: "As regras para usar o Farejo: o que o serviço faz, o que é proibido, planos e pagamento.",
};

export default function TermosPage() {
  return <LegalPage doc={TERMOS} outro={{ href: "/privacidade", label: "Ler a Política de Privacidade →" }} />;
}
