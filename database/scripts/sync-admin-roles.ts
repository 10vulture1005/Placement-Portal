import { PrismaClient, Role } from "@prisma/client";
import { parseAdminEmails } from "../src/admin-emails";

const db = new PrismaClient();

async function main() {
  const adminEmails = parseAdminEmails();

  const promoted = await db.user.updateMany({
    where: { email: { in: adminEmails }, role: Role.STUDENT },
    data: { role: Role.ADMIN },
  });

  // Removing an address from ADMIN_EMAILS must actually revoke access, so any
  // stored ADMIN that is no longer listed is demoted here.
  const demoted = await db.user.updateMany({
    where: { role: Role.ADMIN, NOT: { email: { in: adminEmails } } },
    data: { role: Role.STUDENT },
  });

  console.log(`Promoted ${promoted.count} account(s); demoted ${demoted.count} stale administrator(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
