/**
 * Texto dos Termos de Uso e da Política de Privacidade.
 *
 * ATENÇÃO — antes de publicar:
 * 1. preencher RESPONSAVEL abaixo (sem isso as páginas mostram "[preencher]");
 * 2. mandar o texto para revisão de um advogado.
 * Este arquivo é só o conteúdo; a página que o desenha fica em src/app/termos e src/app/privacidade.
 */

export const RESPONSAVEL = {
  /** Razão social ou nome completo de quem responde pelo Farejo. */
  nome: "[preencher: nome ou razão social]",
  /** CNPJ ou CPF. */
  documento: "[preencher: CNPJ ou CPF]",
  /** Caixa de e-mail para assuntos de privacidade. */
  email: "privacidade@farejoapp.com",
  /** Caixa de e-mail para suporte em geral. */
  suporte: "[preencher: e-mail de suporte]",
  /** Cidade/UF do foro. */
  foro: "[preencher: cidade e estado]",
};

export const ATUALIZADO_EM = "19 de setembro de 2026";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Linhas de tabela: [o quê, para quê, por quanto tempo]. */
  table?: { head: string[]; rows: string[][] };
};

export type LegalDoc = {
  slug: "termos" | "privacidade";
  title: string;
  intro: string;
  sections: LegalSection[];
};

const naoSomos =
  "O Farejo não tem vínculo, patrocínio nem aprovação do Instagram ou da Meta. Não acessamos contas, não lemos mensagens e nunca pedimos a senha do seu Instagram.";

export const TERMOS: LegalDoc = {
  slug: "termos",
  title: "Termos de Uso",
  intro:
    "Estas são as regras para usar o Farejo. Ao criar uma conta ou fazer uma análise, você concorda com elas.",
  sections: [
    {
      heading: "1. Quem oferece o serviço",
      paragraphs: [
        `O Farejo é oferecido por ${RESPONSAVEL.nome}, inscrito sob o nº ${RESPONSAVEL.documento}. Para falar com a gente: ${RESPONSAVEL.suporte}.`,
      ],
    },
    {
      heading: "2. O que o Farejo faz",
      paragraphs: [
        "O Farejo organiza informações que já são públicas em perfis do Instagram: quem o perfil começou a seguir, com quem ele interage publicamente, publicações, reels, marcações, destaques e dados do próprio perfil.",
        naoSomos,
      ],
    },
    {
      heading: "3. Idade mínima",
      paragraphs: ["O Farejo é para maiores de 18 anos. Se você tem menos, não use o serviço."],
    },
    {
      heading: "4. Uso proibido",
      paragraphs: [
        "Você não pode usar o Farejo para perseguir, assediar, ameaçar, constranger ou vigiar alguém, nem para qualquer finalidade que viole a lei ou a privacidade de outra pessoa.",
        "Descumprir esta regra encerra a conta, sem devolução do valor pago.",
      ],
      bullets: [
        "não use para monitorar alguém contra a vontade dela",
        "não use para reunir informação sobre menores de idade",
        "não revenda, copie em massa nem automatize o acesso ao serviço",
        "não tente burlar limites, autenticação ou proteções técnicas",
      ],
    },
    {
      heading: "5. Precisão das informações",
      paragraphs: [
        "O Farejo mostra o que estava público no momento da leitura, através de um provedor terceiro de dados. Não garantimos que a informação esteja completa nem que continue igual depois.",
        "A divisão entre mulheres e homens é uma estimativa feita a partir do primeiro nome e pode errar.",
        "Seguir alguém não prova nada sobre a intenção de ninguém. O Farejo mostra mudanças públicas, não conclusões.",
      ],
    },
    {
      heading: "6. Conta e acesso",
      paragraphs: [
        "O acesso é por código enviado ao seu e-mail ou WhatsApp. O código é pessoal: quem tiver acesso à sua caixa de mensagens entra na sua conta.",
        "O plano grátis permite 1 perfil analisado por pessoa. Reabrir o mesmo perfil continua liberado.",
      ],
    },
    {
      heading: "7. Planos e pagamento",
      bullets: [
        "o pagamento é processado pela Stripe; o Farejo não recebe nem guarda os dados do seu cartão",
        "a assinatura PRO é renovada automaticamente até você cancelar",
        "o cancelamento pode ser feito a qualquer momento e vale para o próximo ciclo; o período já pago continua ativo",
        "o uso único é uma compra avulsa e não renova",
        "arrependimento: você pode desistir em até 7 dias da compra e receber o valor de volta, conforme o Código de Defesa do Consumidor",
      ],
    },
    {
      heading: "8. Se você foi pesquisado no Farejo",
      paragraphs: [
        `Se o seu perfil apareceu no Farejo e você não quer mais que ele seja analisado, peça a remoção em ${RESPONSAVEL.email}. O @ entra numa lista de bloqueio e deixa de ser consultado.`,
      ],
    },
    {
      heading: "9. Interrupções e mudanças",
      paragraphs: [
        "O serviço depende de terceiros (provedor de dados, hospedagem, pagamento) e pode ficar indisponível ou mudar. Avisamos as mudanças relevantes destes Termos na própria página, com nova data de atualização.",
      ],
    },
    {
      heading: "10. Lei e foro",
      paragraphs: [
        `Estes Termos seguem a lei brasileira. Fica eleito o foro de ${RESPONSAVEL.foro}, salvo o direito do consumidor de acionar o foro do seu domicílio.`,
      ],
    },
  ],
};

export const PRIVACIDADE: LegalDoc = {
  slug: "privacidade",
  title: "Política de Privacidade",
  intro:
    "Esta política explica que dados o Farejo trata, para quê, por quanto tempo e quais são os seus direitos — seus e de quem é pesquisado aqui.",
  sections: [
    {
      heading: "1. Quem é o responsável",
      paragraphs: [
        `${RESPONSAVEL.nome}, inscrito sob o nº ${RESPONSAVEL.documento}. Contato para assuntos de privacidade: ${RESPONSAVEL.email}.`,
      ],
    },
    {
      heading: "2. Dados de quem usa o Farejo",
      table: {
        head: ["Dado", "Para quê", "Por quanto tempo"],
        rows: [
          ["E-mail ou telefone", "enviar o código de acesso e identificar a conta", "enquanto a conta existir"],
          ["Nome (opcional)", "chamar você pelo nome", "enquanto a conta existir"],
          ["Código de acesso", "entrar sem senha", "10 minutos, guardado apenas de forma embaralhada"],
          ["Perfis pesquisados e perfis no Faro", "entregar o serviço", "até você remover"],
          ["Cookies de sessão e de visitante", "manter o login e contar a análise grátis", "30 dias e 1 ano"],
          ["Registro de tentativas erradas no admin", "segurança", "1 dia, com o IP embaralhado"],
          ["Pagamento", "cobrar pelo plano", "fica com a Stripe; o Farejo não vê o cartão"],
        ],
      },
    },
    {
      heading: "3. Dados dos perfis pesquisados",
      paragraphs: [
        "O Farejo consulta apenas informações públicas de perfis do Instagram, por meio de um provedor terceiro. Perfil privado continua privado: não acessamos conteúdo restrito, mensagens nem stories de contas fechadas.",
        "Guardamos um cache temporário para não repetir consultas — stories por 3 horas, dados do perfil por 7 dias e o restante por 24 horas. Para perfis acompanhados por um assinante, guardamos o histórico das leituras enquanto o acompanhamento existir.",
        "A base legal para esse tratamento é o legítimo interesse, limitado a dados já públicos e sem revelar nada além do que o próprio Instagram mostra a qualquer pessoa.",
      ],
    },
    {
      heading: "4. O que o Farejo nunca faz",
      bullets: [
        "não pede, guarda nem usa a senha do seu Instagram",
        "não acessa contas, mensagens diretas ou conteúdo de perfis privados",
        "não informa à pessoa pesquisada que ela foi pesquisada",
        "não vende os seus dados",
        "não usa localização",
      ],
    },
    {
      heading: "5. Com quem compartilhamos",
      paragraphs: [
        "Usamos empresas que nos ajudam a operar o serviço, cada uma com acesso só ao necessário: provedor de dados públicos do Instagram (HikerAPI), banco de dados (Supabase), hospedagem (Vercel), envio de e-mails (Resend), pagamento (Stripe) e, quando ativado, mensagens por WhatsApp (Meta).",
        "Parte dessas empresas fica fora do Brasil, o que caracteriza transferência internacional de dados, feita com as garantias exigidas pela LGPD.",
      ],
    },
    {
      heading: "6. Seus direitos",
      paragraphs: [
        `A LGPD garante a você: confirmação e acesso aos seus dados, correção, exclusão, portabilidade, informação sobre compartilhamento e revogação do consentimento. Para exercer qualquer um deles, escreva para ${RESPONSAVEL.email}. Respondemos em até 15 dias.`,
      ],
    },
    {
      heading: "7. Remover um perfil do Farejo",
      paragraphs: [
        `Se você foi pesquisado e não quer mais aparecer, peça em ${RESPONSAVEL.email} com o @ do perfil. Ele entra numa lista de bloqueio e deixa de ser consultado pelo Farejo.`,
      ],
    },
    {
      heading: "8. Segurança",
      paragraphs: [
        "Os códigos de acesso são guardados embaralhados, o tráfego é criptografado e o acesso administrativo tem limite de tentativas. Nenhum sistema é infalível: se acontecer um incidente relevante, avisamos quem for afetado e a autoridade competente.",
      ],
    },
    {
      heading: "9. Mudanças nesta política",
      paragraphs: [
        "Quando mudarmos algo relevante, atualizamos esta página e a data no rodapé dela. Vale a versão publicada aqui.",
      ],
    },
  ],
};

export const LEGAL_DOCS = { termos: TERMOS, privacidade: PRIVACIDADE } as const;
