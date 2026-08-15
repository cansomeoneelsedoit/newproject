import { PrismaClient, UserRole, OrgRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "newproject" },
    update: {},
    create: { name: "Newproject", slug: "newproject" },
  });
  const passwordHash = await bcrypt.hash("devpassword", 10);
  const user = await prisma.user.upsert({
    where: { email: "dev@newproject.local" },
    update: {},
    create: { email: "dev@newproject.local", name: "Dev User", passwordHash, role: UserRole.SUPERUSER },
  });
  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: { userId: user.id, organizationId: org.id, role: OrgRole.OWNER },
  });
  console.log("Seeded org + dev superuser:", { org: org.slug, user: user.email });
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
