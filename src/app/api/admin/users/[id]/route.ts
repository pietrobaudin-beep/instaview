import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";
import { logger } from "@/lib/logger";

const log = logger.scope("api:admin");
const bodySchema = z.object({ plan: z.enum(["FREE", "PRO", "AGENCY"]) });

/** Change a user's plan. Admin only. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const user = await prisma.user
    .update({ where: { id: params.id }, data: { plan: parsed.data.plan } })
    .catch(() => null);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  log.info("plan changed by admin", { adminEmail: admin.email, target: user.email, plan: user.plan });
  return NextResponse.json({ id: user.id, email: user.email, plan: user.plan });
}
