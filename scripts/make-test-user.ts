import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();
const EMAIL = "teste@instaview.local";
const PASS = "teste1234";

(async () => {
  const u = await prisma.user.upsert({
    where: { email: EMAIL },
    create: { email: EMAIL, name: "Teste PRO", plan: "PRO", passwordHash: hashPassword(PASS) },
    update: { plan: "PRO", passwordHash: hashPassword(PASS) },
  });
  console.log("conta pronta:", u.email, "| plano:", u.plan, "| senha:", PASS);
  await prisma.$disconnect();
})();
