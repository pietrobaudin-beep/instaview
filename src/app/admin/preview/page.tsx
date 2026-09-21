import { notFound } from "next/navigation";
import { AdminPanel, type Infra, type Live, type Row, type Stats } from "@/components/admin/admin-panel";

export const dynamic = "force-dynamic";

/**
 * A tela de admin com dados de mentira, **só em desenvolvimento**.
 *
 * Serve para olhar o desenho sem precisar do token de admin. Em produção esta
 * rota não existe: responde 404. Nenhum botão aqui chama rota nenhuma.
 */
export default function AdminPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const rows: Row[] = [
    { id: "1", email: "maria@exemplo.com", name: "Maria", plan: "PRO", profiles: 4, createdAt: "2026-09-02T12:00:00Z" },
    { id: "2", email: "joao@exemplo.com", name: "João", plan: "AGENCY", profiles: 11, createdAt: "2026-08-19T12:00:00Z" },
    { id: "3", email: "+5511999990000", name: null, plan: "WEEK", profiles: 1, createdAt: "2026-09-18T12:00:00Z" },
    { id: "4", email: "curiosa@exemplo.com", name: null, plan: "FREE", profiles: 0, createdAt: "2026-09-20T12:00:00Z" },
  ];

  const stats: Stats = {
    periodo: {
      id: "7d",
      de: "2026-09-13T00:00:00Z",
      ate: "2026-09-20T00:00:00Z",
      atual: { farejos: 86, contas: 12, faro: 9, avulsos: 4, receita: 39.6 },
      anterior: { farejos: 71, contas: 15, faro: 9, avulsos: 3, receita: 29.7 },
    },
    planos: [
      { id: "FREE", nome: "Curioso", cobranca: "free", preco: 0, maxConsults: 1, maxProfiles: 0, storiesHours: 0, pessoas: 128, receitaMensal: 0 },
      { id: "WEEK", nome: "Faro de Cão", cobranca: "weekly", preco: 14.9, maxConsults: 3, maxProfiles: 1, storiesHours: null, pessoas: 9, receitaMensal: 582.66 },
      { id: "PRO", nome: "Farejo PRO", cobranca: "monthly", preco: 29.9, maxConsults: 10, maxProfiles: 5, storiesHours: null, pessoas: 14, receitaMensal: 418.6 },
      { id: "AGENCY", nome: "Faro Detetive", cobranca: "yearly", preco: 99.9, maxConsults: 30, maxProfiles: 15, storiesHours: null, pessoas: 6, receitaMensal: 49.95 },
    ],
    meses: [
      { mes: "2026-04", rotulo: "abr", contas: 8, avulsos: 1, receita: 9.9 },
      { mes: "2026-05", rotulo: "mai", contas: 14, avulsos: 3, receita: 29.7 },
      { mes: "2026-06", rotulo: "jun", contas: 19, avulsos: 4, receita: 39.6 },
      { mes: "2026-07", rotulo: "jul", contas: 27, avulsos: 7, receita: 69.3 },
      { mes: "2026-08", rotulo: "ago", contas: 48, avulsos: 10, receita: 99 },
      { mes: "2026-09", rotulo: "set", contas: 41, avulsos: 12, receita: 118.8 },
    ],
    recorrente: 1051.21,
    anual: 12614.52,
    avulso: { preco: 9.9, total: 37, mes: 12, receitaMes: 118.8, receitaTotal: 366.3 },
    noMes: 1170.01,
    usuarios: { total: 157, novosMes: 41, novosSemana: 12, noFaro: 63 },
  };

  const live: Live = {
    agora: 7,
    noDia: 214,
    paises: [
      { nome: "Brasil", total: 6 },
      { nome: "Portugal", total: 1 },
    ],
    cidades: [
      { nome: "São Paulo", total: 3 },
      { nome: "Rio de Janeiro", total: 2 },
      { nome: "Lisboa", total: 1 },
      { nome: "Curitiba", total: 1 },
    ],
    paginas: [
      { nome: "/", total: 4 },
      { nome: "/p/marina.faro", total: 2 },
      { nome: "/pricing", total: 1 },
    ],
    aparelhos: [
      { nome: "celular", total: 6 },
      { nome: "computador", total: 1 },
    ],
    origens: [
      { nome: "instagram.com", total: 3 },
      { nome: "google.com", total: 1 },
    ],
    horas: Array.from({ length: 24 }, (_, i) => ({
      hora: i,
      pessoas: [2, 1, 1, 0, 0, 1, 3, 6, 9, 12, 14, 11, 13, 16, 15, 12, 10, 14, 19, 22, 18, 12, 7, 4][i],
    })),
    paisesDoDia: [
      { nome: "Brasil", total: 186 },
      { nome: "Portugal", total: 18 },
      { nome: "Estados Unidos", total: 10 },
    ],
  };

  const infra: Infra = {
    hiker: {
      requisicoesRestantes: 1491,
      dinheiro: 29.96,
      moeda: "USD",
      porSegundo: 13,
      consumoHoje: 128,
      consumo7d: 980,
      custoHoje: 0.128,
      periodo: "7d",
      consumoPeriodo: 980,
      diasComLeitura: 3,
      farejosNoPeriodo: 26,
      coletasNoPeriodo: 41,
      porRequisicao: 0.001,
      diasRestantes: 11,
      esperadoPorDia: 57,
      perfisNoFaro: 19,
      secoesPorDia: 3,
      custoEsperadoMes: 1.73,
      guardado: [
        { secao: "hiker:hiker-user", linhas: 412 },
        { secao: "img", linhas: 297 },
        { secao: "hiker:profile", linhas: 288 },
        { secao: "hiker:posts", linhas: 96 },
        { secao: "hiker:stories", linhas: 74 },
      ],
    },
    banco: {
      bytes: 50 * 1024 ** 2,
      limiteBytes: 8 * 1024 ** 3,
      limiteGb: 8,
      tabelas: [
        { nome: "followers", bytes: 19 * 1024 ** 2 },
        { nome: "section_cache", bytes: 12.7 * 1024 ** 2 },
        { nome: "follower_changes", bytes: 5.3 * 1024 ** 2 },
        { nome: "profile_events", bytes: 0.6 * 1024 ** 2 },
        { nome: "live_visits", bytes: 0.1 * 1024 ** 2 },
      ],
      imagens: { bytes: 12 * 1024 ** 2, linhas: 214 },
    },
    usuarios: [
      { id: "1", quem: "maria@exemplo.com", perfis: 4, bytes: 380 * 1024 },
      { id: "2", quem: "joao@exemplo.com", perfis: 11, bytes: 240 * 1024 },
      { id: "3", quem: "+5511999990000", perfis: 1, bytes: 26 * 1024 },
    ],
  };

  return <AdminPanel adminEmail="" demo={{ rows, stats, live, infra }} />;
}
