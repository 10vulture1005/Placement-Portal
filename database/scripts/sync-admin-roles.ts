import { PrismaClient, Role } from "@prisma/client";
import { parseAdminEmails } from "../src/admin-emails";
import { loadRootEnv } from "../src/load-root-env";

loadRootEnv();

const db = new PrismaClient();

async function main() {
  const adminEmails = parseAdminEmails();

  const promoted = await db.user.updateMany({
    where: { email: { in: adminEmails }, role: { notIn: [Role.ADMIN, Role.SUPER_ADMIN] } },
    data: { role: Role.ADMIN },
  });

  console.log(`Promoted ${promoted.count} account(s) matching ADMIN_EMAILS.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
