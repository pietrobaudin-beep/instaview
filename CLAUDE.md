# Farejo — regras fixas para a IA

Farejo (farejoapp.com): a pessoa digita um @ do Instagram e vê dados **públicos** — quem segue, com quem interage, o que mudou. O **Faro AI** (= **Rastros** + **Chat**) acompanha um perfil no tempo. Next.js 14 (App Router) + Prisma/Supabase (projeto **instaview**) + Vercel (push em `main` = produção) + HikerAPI + OpenAI + Cakto (pagamento).

Estas regras só mudam quando o dono (Pietro) pedir. A cópia legível fica no Obsidian: `Regras para a IA`.

## 1. Começo e fim de toda sessão

- **Antes de agir**, leia (Obsidian, cofre em `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/baudin/Projetos/Farejo/`):
  1. `01 - Visão e estado/Onde paramos.md` — último commit, o que estava sendo feito, próximo passo;
  2. `01 - Visão e estado/Estado do projeto.md` — o que está no ar, fora do ar e pendente com o dono;
  3. depois `git log --oneline -10` e `git status`.
- **Depois de cada push:** atualize `Onde paramos.md`, o commit no topo de `Estado do projeto.md` e uma entrada em `04 - Histórico e referências/Histórico de versões.md`.
- **Antes de o contexto acabar:** atualize `Onde paramos.md` com o que estava pela metade e o próximo passo exato.

## 2. Nunca mudar o que o dono não pediu

- Não troque comportamento, fluxo, texto ou nome de botão que não foi pedido — **nem para economizar**. Tem motivo (custo, segurança)? **Proponha** e espere.
- Fixos até ele pedir:
  - **Busca:** sugestões aparecem sozinhas ao digitar; botão **travado até marcar o perfil**; o botão diz **Farejar**.
  - **Perfil sem pagamento:** sem pop-up; oferta **embaixo**; partes pagas **borradas**, não escondidas.
  - **Vitrine:** 3 cartões — Farejador ↔ Farejador + (mesmo cartão, com chave) · **Faro de Cão no meio** · Faro de Detetive. **Curioso não aparece** como plano. Botões compram direto (`/checkout`).
  - **Checkout:** `/checkout` dentro do site, **sem conta**; depois de pagar entra com **código no e-mail**; o X volta de onde veio.
  - **Preços:** Farejador R$ 9,90 · Farejador + R$ 19,90 (passe de 7 dias, sem renovação) · Cão R$ 39,90/mês · Detetive R$ 59,90/mês. Só mudam com OK.

## 3. Ética (inegociável)

- Só dados públicos. Nunca pedir senha do Instagram nem entrar em conta de ninguém.
- Sem reconhecimento facial. Gênero/rankings são **estimativas** e ditos assim.
- Nunca afirmar intenção, traição ou relação entre pessoas; nunca rotular pessoas reais de forma difamatória.

## 4. Custo e dinheiro

- **Nunca gaste crédito da HikerAPI testando.** Localhost = provedor mock. Nunca abra `/p/<perfil>` em produção para testar.
- Cada chamada ao Instagram = **R$ 0,11**. **Avise todo aumento de custo**, com o número.
- Compra nunca faz login automático (sempre código no e-mail que pagou). Checkout só abre com `CAKTO_WEBHOOK_SECRET` configurado.

## 5. Segurança e dados

- **Chaves/tokens/segredos:** nunca digite, grave em arquivo ou use — mesmo colados no chat. O dono põe na Vercel. Se aparecerem no chat, recomende trocar.
- **Banco de produção só com OK.** Schema: gere o SQL (só acréscimos, `IF NOT EXISTS`) para o dono rodar no SQL Editor do projeto **instaview** (não "pietrobaudin-beep's Project").
- O localhost usa o **mesmo banco** do site. Teste que grava: PGlite local (`scratchpad/pglocal`, porta 5499) + `.env.development.local` temporário (`pgbouncer=true`), apagado no fim.
- Nunca apague dados de usuários de vez sem OK.

## 6. Jeito de trabalhar

- Mostre no localhost antes de subir, salvo quando ele diz **"suba"**. Depois do push, confira o deploy Ready.
- Pare o servidor local antes de `npm run build`.
- A pasta está no iCloud: `node_modules` e `.next` são links `.nosync` — não recrie como pastas.
- Responda em **português, curto, sem jargão**. Quando algo depende dele, diga o passo a passo.
