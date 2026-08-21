import { PrismaClient, Role } from "@prisma/client";
import { parseAdminEmails } from "../src/admin-emails";
import { loadRootEnv } from "../src/load-root-env";

loadRootEnv();

const prisma = new PrismaClient();

async function main() {
  const adminEmails = parseAdminEmails();

  if (adminEmails.length === 0) {
    console.warn(
      "ADMIN_EMAILS is empty, so no administrator account was seeded. Set it in .env and re-run this seed.",
    );
    return;
  }

  for (const email of adminEmails) {
    await prisma.user.upsert({
      where: { email },
      update: { role: Role.ADMIN },
      create: { email, name: "Placement Office", role: Role.ADMIN, semGPAs: [] },
    });
  }

  console.log(`Seeded ${adminEmails.length} administrator account(s) from ADMIN_EMAILS.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
