import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { grantUnlock } from "@/lib/access";
import { fimDoCiclo } from "@/lib/direitos";
import { isValidUsername, normalizeUsername } from "@/lib/utils";
import { avulsoAnotado, caktoConfigurado, lerCallback, planoDoProduto, produtoDaOferta, webhookValido } from "@/lib/billing/cakto";

const log = logger.scope("cakto:webhook");

export const dynamic = "force-dynamic";

/**
 * Webhook da Cakto. Configure no painel com os eventos:
 * purchase_approved, subscription_created, subscription_renewed,
 * subscription_canceled, refund, chargeback.
 *
 * Tudo aqui é idempotente — a Cakto reenvia —: dar o mesmo plano duas vezes
 * ou regravar o mesmo desbloqueio não muda nada.
 */
export async function POST(req: Request) {
  if (!caktoConfigurado()) return NextResponse.json({ error: "not configured" }, { status: 501 });

  const raw = await req.text();
  let corpo: any;
  try {
    corpo = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!webhookValido(raw, req.headers, corpo)) {
    log.warn("webhook recusado: segredo não confere");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const evento: string = corpo?.event ?? "";
  const d = corpo?.data ?? {};
  const produto = produtoDaOferta(d?.offer?.id, d?.checkoutUrl);
  const pedido: string | null = d?.id ? `cakto:${d.id}` : null;

  // Quem pagou: o callback do link; senão o e-mail do comprador.
  const cb = lerCallback(d?.callback) ?? lerCallback(d?.sck);
  let userId = cb?.userId ?? null;
  if (userId && !(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) userId = null;
  if (!userId && d?.customer?.email) {
    const u = await prisma.user.findUnique({
      where: { email: String(d.customer.email).toLowerCase() },
      select: { id: true },
    });
    userId = u?.id ?? null;
  }

  if (!produto || !userId) {
    // 200 mesmo assim: um 4xx faria a Cakto parar e o evento sumir do radar.
    // Fica no log para conferir à mão.
    log.error("evento sem produto ou sem conta", { evento, oferta: d?.offer?.id, pedido, temCallback: !!cb });
    return NextResponse.json({ received: true, ignorado: true });
  }

  try {
    switch (evento) {
      case "purchase_approved":
      case "subscription_created":
      case "subscription_renewed": {
        if (produto === "SINGLE") {
          const username = normalizeUsername(cb?.username ?? (await avulsoAnotado(userId)) ?? "");
          if (!isValidUsername(username)) {
            log.error("avulso sem @ no callback", { pedido });
            break;
          }
          await grantUnlock(userId, username, pedido);
          log.info("avulso liberado", { userId, username });
          break;
        }
        const plan = planoDoProduto(produto)!;
        // Farejador +: passe de 7 dias, pagamento único — começa agora e acaba
        // sozinho. Comprar de novo antes do fim soma a partir do fim atual.
        if (produto === "FAREJADOR_MAIS") {
          const u = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, planEndsAt: true } });
          const agora = new Date();
          const base =
            u?.plan === "FAREJADOR_MAIS" && u.planEndsAt && u.planEndsAt > agora ? u.planEndsAt : agora;
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan,
              planStartedAt: base === agora ? agora : undefined,
              planEndsAt: new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000),
            },
          });
          log.info("passe de 7 dias liberado", { userId });
          break;
        }
        const atual = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
        // Renovação do mesmo plano mantém a âncora do ciclo; plano novo começa agora.
        await prisma.user.update({
          where: { id: userId },
          data: atual?.plan === plan ? { planEndsAt: null } : { plan, planStartedAt: new Date(), planEndsAt: null },
        });
        log.info("plano liberado", { userId, plan, evento });
        break;
      }
      case "subscription_canceled": {
        // Usa até o fim do período pago; depois a conta volta a ser Curioso.
        const u = await prisma.user.findUnique({ where: { id: userId } });
        if (u && u.plan === planoDoProduto(produto)) {
          await prisma.user.update({ where: { id: userId }, data: { planEndsAt: fimDoCiclo(u) ?? new Date() } });
        }
        break;
      }
      case "refund":
      case "chargeback": {
        // Dinheiro devolvido: o acesso acaba agora.
        if (produto === "SINGLE") {
          const username = normalizeUsername(cb?.username ?? (await avulsoAnotado(userId)) ?? "");
          if (isValidUsername(username)) {
            await prisma.profileUnlock.updateMany({ where: { userId, username }, data: { expiresAt: new Date() } });
          }
        } else {
          await prisma.user.updateMany({
            where: { id: userId, plan: planoDoProduto(produto)! },
            data: { planEndsAt: new Date() },
          });
        }
        log.info("acesso encerrado por " + evento, { userId, produto });
        break;
      }
      default:
        log.debug("evento ignorado", { evento });
    }
  } catch (e) {
    log.error("falha ao tratar", { evento, error: e });
    return NextResponse.json({ error: "handler" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
