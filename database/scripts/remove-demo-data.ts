/**
 * Removes everything created by `npm run db:seed:demo`.
 *
 * The demonstration seeder writes deterministic `demo-` prefixed ids, so this
 * script can delete exactly those rows and leave real records untouched. It also
 * clears the single hand-written job from before the dataset existed.
 */
import { PrismaClient } from "@prisma/client";
import { loadRootEnv } from "../src/load-root-env";

loadRootEnv();

const db = new PrismaClient();

const demoRows = { id: { startsWith: "demo-" } };

async function removeLegacyDemoJob() {
  const legacyJobId = "seed-atlassian-swe";
  const legacyJob = await db.jobProfile.findUnique({
    where: { id: legacyJobId },
    select: { companyId: true },
  });
  if (!legacyJob) return 0;

  await db.jobProfile.delete({ where: { id: legacyJobId } });
  const [remainingJobs, announcements] = await Promise.all([
    db.jobProfile.count({ where: { companyId: legacyJob.companyId } }),
    db.announcement.count({ where: { companyId: legacyJob.companyId } }),
  ]);
  if (!remainingJobs && !announcements) {
    await db.company.deleteMany({ where: { id: legacyJob.companyId, name: "Atlassian" } });
  }
  return 1;
}

async function main() {
  // Ordered so that rows are gone before the records they point at, rather than
  // relying on which relations happen to cascade.
  const application = await db.application.deleteMany({ where: demoRows });
  const coordinator = await db.coordinator.deleteMany({ where: demoRows });
  const announcement = await db.announcement.deleteMany({ where: demoRows });
  const feedback = await db.feedback.deleteMany({ where: demoRows });
  const nocRequest = await db.nocRequest.deleteMany({ where: demoRows });
  const jobProfile = await db.jobProfile.deleteMany({ where: demoRows });
  const company = await db.company.deleteMany({ where: demoRows });
  const user = await db.user.deleteMany({ where: demoRows });
  const teamMember = await db.teamMember.deleteMany({ where: demoRows });

  const legacy = await removeLegacyDemoJob();

  const removed = {
    applications: application.count,
    coordinators: coordinator.count,
    announcements: announcement.count,
    feedback: feedback.count,
    "NOC requests": nocRequest.count,
    "job profiles": jobProfile.count,
    companies: company.count,
    students: user.count,
    "team members": teamMember.count,
  };

  const total = Object.values(removed).reduce((sum, count) => sum + count, 0);
  if (total === 0 && legacy === 0) {
    console.log("No demonstration data was present.");
    return;
  }

  console.log("Removed demonstration data:");
  for (const [label, count] of Object.entries(removed)) {
    if (count > 0) console.log(`  ${label} ${count}`);
  }
  if (legacy > 0) console.log("  legacy demonstration job 1");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
