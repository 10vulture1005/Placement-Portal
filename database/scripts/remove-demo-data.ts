import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const demoJobId = "seed-atlassian-swe";
  const demoJob = await db.jobProfile.findUnique({
    where: { id: demoJobId },
    select: { companyId: true },
  });

  if (!demoJob) {
    console.log("No legacy demonstration job was found.");
    return;
  }

  await db.jobProfile.delete({ where: { id: demoJobId } });
  const [remainingJobs, announcements] = await Promise.all([
    db.jobProfile.count({ where: { companyId: demoJob.companyId } }),
    db.announcement.count({ where: { companyId: demoJob.companyId } }),
  ]);
  if (!remainingJobs && !announcements) {
    await db.company.deleteMany({
      where: { id: demoJob.companyId, name: "Atlassian" },
    });
  }

  console.log("Legacy demonstration job removed; its company was removed when unused.");
}

main().finally(() => db.$disconnect());
