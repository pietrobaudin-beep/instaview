/**
 * Short guides for the landing page ("Entenda os rastros") and /guias.
 *
 * Kept honest on purpose: they explain what Instagram shows, what it doesn't,
 * and what the Farejo can and cannot do — no promises beyond public data.
 */

export interface Guide {
  slug: string;
  tag: string;
  title: string;
  description: string;
  minutes: number;
  sections: { heading?: string; paragraphs: string[] }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "como-ver-quem-alguem-comecou-a-seguir",
    tag: "Guia",
    title: "Como ver quem alguém começou a seguir no Instagram",
    description:
      "O Instagram não mostra isso de forma direta. Veja o que dá para fazer na mão e como o Farejo organiza essa pista para você.",
    minutes: 3,
    sections: [
      {
        paragraphs: [
          "Durante um tempo, o Instagram teve uma aba que mostrava a atividade de quem você segue: curtidas, comentários e novos follows. Essa aba foi removida em 2019. Desde então, não existe um lugar no app que diga “fulano começou a seguir alguém”.",
          "Mesmo assim, a informação continua pública na lista de seguidos de qualquer perfil aberto. O que falta é organização.",
        ],
      },
      {
        heading: "Na mão: comparar a lista ao longo do tempo",
        paragraphs: [
          "O jeito manual é abrir a lista de seguidos, anotar quem está lá e voltar dias depois para comparar. Funciona, mas é lento: perfis com centenas de contas seguidas viram uma tarefa de horas, e é fácil deixar passar alguém.",
        ],
      },
      {
        heading: "Com o Farejo",
        paragraphs: [
          "Você digita o @ e o Farejo lê a lista pública de seguidos, separa pessoas de marcas e contas verificadas e mostra quantas são mulheres e quantos são homens (uma estimativa pelo primeiro nome).",
          "Com o PRO, você coloca o perfil no Faro. A partir daí, cada nova leitura é comparada com a anterior, e o que mudou vira uma pista: quem entrou, quem saiu e quando o Farejo percebeu.",
        ],
      },
      {
        heading: "O que não dá para ver",
        paragraphs: [
          "Perfis privados não mostram a lista para quem não é seguidor, e o Farejo respeita isso: nesses casos, você só vê que a conta é privada. Mensagens, stories privados e qualquer coisa fora do que é público também ficam de fora.",
        ],
      },
    ],
  },
  {
    slug: "lista-de-seguidos-fora-de-ordem",
    tag: "Explicação",
    title: "Por que a lista de seguidos do Instagram parece fora de ordem",
    description:
      "A ordem que aparece no perfil dos outros não é, necessariamente, a ordem em que a pessoa seguiu cada conta. Entenda.",
    minutes: 2,
    sections: [
      {
        paragraphs: [
          "No seu próprio perfil, o Instagram deixa ordenar quem você segue por data. No perfil de outra pessoa, a lista aparece na ordem padrão do app, e essa ordem não é garantida como cronológica.",
          "Na prática, isso quer dizer que a primeira conta da lista pode não ser a mais recente. Tirar conclusões só pela posição na lista costuma dar errado.",
        ],
      },
      {
        heading: "Então como saber o que é novo?",
        paragraphs: [
          "O jeito confiável é comparar duas fotografias da lista em momentos diferentes. O que aparece na segunda e não estava na primeira é novo, independentemente da posição.",
          "É exatamente isso que o Farejo faz quando um perfil está no seu Faro: guarda cada leitura e compara com a anterior.",
        ],
      },
    ],
  },
  {
    slug: "o-que-o-farejo-ve",
    tag: "Privacidade",
    title: "O que o Farejo vê (e o que não vê)",
    description:
      "Sem senha, sem login no Instagram e sem mexer em conta nenhuma. Veja de onde vêm os dados e quais são os limites.",
    minutes: 2,
    sections: [
      {
        heading: "De onde vêm os dados",
        paragraphs: [
          "O Farejo trabalha só com informações públicas: foto, nome, bio, contadores, a lista de seguidos de perfis abertos e interações visíveis em posts públicos.",
          "Nunca pedimos senha, nem a sua nem a de ninguém, e não entramos em nenhuma conta do Instagram para buscar dados.",
        ],
      },
      {
        heading: "A pessoa fica sabendo?",
        paragraphs: [
          "Não. O Farejo não segue, não curte, não comenta e não manda nada para o perfil pesquisado. Nenhuma notificação é enviada.",
        ],
      },
      {
        heading: "Os limites",
        paragraphs: [
          "Perfis privados ficam fechados. A divisão entre mulheres e homens é uma estimativa pelo primeiro nome e pode errar. Marcas e contas verificadas ficam de fora, porque o Farejo é sobre pessoas.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}
