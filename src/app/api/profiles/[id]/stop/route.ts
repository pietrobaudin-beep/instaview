import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ValidationError, setMonitoring } from "@/lib/profiles";

const bodySchema = z.object({ enabled: z.boolean() });

/** Start/Stop monitoring toggle. Body: { enabled: boolean }. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "enabled is required" }, { status: 400 });

  try {
    await setMonitoring(user.id, params.id, parsed.data.enabled);
    return NextResponse.json({ ok: true, enabled: parsed.data.enabled });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 404 });
    return NextResponse.json({ error: "Failed to update monitoring" }, { status: 500 });
  }
}
