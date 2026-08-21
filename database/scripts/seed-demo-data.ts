/**
 * Seeds the demonstration dataset packaged in database/seed-data.zip.
 *
 * Every row is written with a deterministic `demo-` prefixed id, so this script
 * is safe to re-run and `npm run db:remove-demo` can delete exactly what it
 * created without touching real records.
 *
 * The dataset stores dates as offsets rather than absolute timestamps, so the
 * archive does not go stale: registration deadlines stay in the future and
 * application history stays in the past no matter when the seed runs.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import AdmZip from "adm-zip";
import { PrismaClient } from "@prisma/client";
import type {
  AnnouncementCategory,
  ApplicationStatus,
  FeedbackType,
  JobStatus,
  JobType,
  NocStatus,
} from "@prisma/client";
import { parseAdminEmails } from "../src/admin-emails";
import { loadRootEnv } from "../src/load-root-env";

loadRootEnv();

const db = new PrismaClient();

const archivePath = resolve(__dirname, "..", "seed-data.zip");
const DAY_MS = 86_400_000;
const startedAt = Date.now();
const currentYear = new Date().getFullYear();

function offsetDays(days: number) {
  return new Date(startedAt + days * DAY_MS);
}

function demoId(kind: string, slug: string) {
  return `demo-${kind}-${slug}`;
}

function studentEmail(slug: string) {
  const domain = (process.env.STUDENT_EMAIL_DOMAIN || "iiitl.ac.in").replace(/^@/, "");
  return `demo.${slug.replace(/-/g, ".")}@${domain}`;
}

interface CompanyRecord {
  slug: string;
  name: string;
  website?: string;
  description?: string;
}

interface StudentRecord {
  slug: string;
  name: string;
  rollNumber: string;
  branch: string;
  degree: string;
  batchOffset: number;
  gender: string;
  category: string;
  contactNumber: string;
  class10Percent: number;
  class12Percent: number;
  semGPAs: number[];
  cgpa: number;
  backlogs: number;
}

interface JobRecord {
  slug: string;
  companySlug: string;
  title: string;
  type: JobType;
  locations: string[];
  ctcStipend?: number;
  ctcStipendInfo?: string;
  minCGPA: number;
  maxBacklogs: number;
  maxBans: number;
  allowedBranches: string[];
  allowedDegrees: string[];
  allowedGenders: string[];
  jobCategory?: string;
  batchOffset: number;
  deadlineInDays: number;
  status: JobStatus;
  openingOverview?: string;
  description?: string;
  coordinators: { name: string; phone: string }[];
}

interface ApplicationRecord {
  studentSlug: string;
  jobSlug: string;
  status: ApplicationStatus;
  appliedDaysAgo: number;
}

interface AnnouncementRecord {
  slug: string;
  title: string;
  companySlug?: string;
  category: AnnouncementCategory;
  tags: string[];
  content: string;
  createdDaysAgo: number;
}

interface FeedbackRecord {
  slug: string;
  studentSlug: string;
  feedbackType: FeedbackType;
  content: string;
  resolved: boolean;
  adminResponse?: string;
  createdDaysAgo: number;
  resolvedDaysAgo?: number;
}

interface NocRecord {
  slug: string;
  studentSlug: string;
  company: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  startDaysFromNow: number;
  durationDays: number;
  status: NocStatus;
  message?: string;
  documentUrl?: string | null;
}

interface TeamRecord {
  slug: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  displayOrder: number;
}

function openArchive() {
  if (!existsSync(archivePath)) {
    throw new Error(
      `seed-data.zip was not found at ${archivePath}. Run "npm run db:pack:demo" to build it from database/seed-data/.`,
    );
  }
  return new AdmZip(archivePath);
}

function readEntry<T>(zip: AdmZip, name: string): T {
  const entry = zip.getEntry(name);
  if (!entry) {
    throw new Error(`seed-data.zip is missing ${name}. Re-run "npm run db:pack:demo".`);
  }
  return JSON.parse(entry.getData().toString("utf8")) as T;
}

function lookup(map: Map<string, string>, slug: string, kind: string, referencedBy: string) {
  const id = map.get(slug);
  if (!id) {
    throw new Error(`${referencedBy} references unknown ${kind} "${slug}".`);
  }
  return id;
}

/**
 * Job profiles and announcements need an author. The dataset deliberately does
 * not invent one, because ADMIN_EMAILS is the only source of administrator
 * access and seeding a synthetic admin would quietly work around that rule.
 */
async function resolveAdministratorId() {
  const configured = parseAdminEmails();
  if (configured.length > 0) {
    const match = await db.user.findFirst({
      where: { email: { in: configured } },
      select: { id: true },
    });
    if (match) return match.id;
  }

  const anyAdmin = await db.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (anyAdmin) return anyAdmin.id;

  throw new Error(
    "No administrator exists yet, so demonstration jobs would have no author. Set ADMIN_EMAILS in .env and run \"npm run db:seed\" first.",
  );
}

async function seedCompanies(records: CompanyRecord[]) {
  const ids = new Map<string, string>();
  for (const record of records) {
    const id = demoId("company", record.slug);
    const data = {
      name: record.name,
      website: record.website ?? null,
      description: record.description ?? null,
    };
    await db.company.upsert({ where: { id }, update: data, create: { id, ...data } });
    ids.set(record.slug, id);
  }
  return ids;
}

async function seedStudents(records: StudentRecord[]) {
  const ids = new Map<string, string>();
  for (const record of records) {
    const email = studentEmail(record.slug);
    const data = {
      name: record.name,
      rollNumber: record.rollNumber,
      branch: record.branch,
      degree: record.degree,
      batch: currentYear + record.batchOffset,
      gender: record.gender,
      category: record.category,
      contactNumber: record.contactNumber,
      class10Percent: record.class10Percent,
      class12Percent: record.class12Percent,
      semGPAs: record.semGPAs,
      cgpa: record.cgpa,
      backlogs: record.backlogs,
    };
    // Keyed on email rather than id because email is the identity Auth.js uses;
    // the deterministic id is only applied when the row is first created.
    const user = await db.user.upsert({
      where: { email },
      update: data,
      create: { id: demoId("user", record.slug), email, role: "STUDENT", ...data },
      select: { id: true },
    });
    ids.set(record.slug, user.id);
  }
  return ids;
}

async function seedJobs(
  records: JobRecord[],
  companyIds: Map<string, string>,
  createdById: string,
) {
  const ids = new Map<string, string>();
  for (const record of records) {
    const id = demoId("job", record.slug);
    const data = {
      companyId: lookup(companyIds, record.companySlug, "company", `job "${record.slug}"`),
      title: record.title,
      type: record.type,
      locations: record.locations,
      ctcStipend: record.ctcStipend ?? null,
      ctcStipendInfo: record.ctcStipendInfo ?? null,
      minCGPA: record.minCGPA,
      maxBacklogs: record.maxBacklogs,
      maxBans: record.maxBans,
      allowedBranches: record.allowedBranches,
      allowedDegrees: record.allowedDegrees,
      allowedGenders: record.allowedGenders,
      jobCategory: record.jobCategory ?? null,
      batch: currentYear + record.batchOffset,
      registrationDeadline: offsetDays(record.deadlineInDays),
      status: record.status,
      openingOverview: record.openingOverview ?? null,
      description: record.description ?? null,
      createdById,
    };
    await db.jobProfile.upsert({ where: { id }, update: data, create: { id, ...data } });

    await db.coordinator.deleteMany({ where: { jobProfileId: id } });
    if (record.coordinators.length > 0) {
      await db.coordinator.createMany({
        data: record.coordinators.map((coordinator, index) => ({
          id: demoId("coordinator", `${record.slug}-${index}`),
          jobProfileId: id,
          name: coordinator.name,
          phone: coordinator.phone,
        })),
      });
    }

    ids.set(record.slug, id);
  }
  return ids;
}

async function seedApplications(
  records: ApplicationRecord[],
  studentIds: Map<string, string>,
  jobIds: Map<string, string>,
) {
  for (const record of records) {
    const label = `application "${record.studentSlug} -> ${record.jobSlug}"`;
    const userId = lookup(studentIds, record.studentSlug, "student", label);
    const jobProfileId = lookup(jobIds, record.jobSlug, "job", label);
    const appliedAt = offsetDays(-record.appliedDaysAgo);

    await db.application.upsert({
      where: { userId_jobProfileId: { userId, jobProfileId } },
      update: { status: record.status, appliedAt },
      create: {
        id: demoId("application", `${record.studentSlug}--${record.jobSlug}`),
        userId,
        jobProfileId,
        status: record.status,
        appliedAt,
      },
    });
  }
}

async function seedAnnouncements(
  records: AnnouncementRecord[],
  companyIds: Map<string, string>,
  createdById: string,
) {
  for (const record of records) {
    const id = demoId("announcement", record.slug);
    const data = {
      title: record.title,
      companyId: record.companySlug
        ? lookup(companyIds, record.companySlug, "company", `announcement "${record.slug}"`)
        : null,
      content: record.content,
      tags: record.tags,
      category: record.category,
      createdAt: offsetDays(-record.createdDaysAgo),
      createdById,
    };
    await db.announcement.upsert({ where: { id }, update: data, create: { id, ...data } });
  }
}

async function seedFeedback(records: FeedbackRecord[], studentIds: Map<string, string>) {
  for (const record of records) {
    const id = demoId("feedback", record.slug);
    const data = {
      userId: lookup(studentIds, record.studentSlug, "student", `feedback "${record.slug}"`),
      feedbackType: record.feedbackType,
      content: record.content,
      resolved: record.resolved,
      adminResponse: record.adminResponse ?? null,
      createdAt: offsetDays(-record.createdDaysAgo),
      resolvedAt:
        record.resolvedDaysAgo === undefined ? null : offsetDays(-record.resolvedDaysAgo),
    };
    await db.feedback.upsert({ where: { id }, update: data, create: { id, ...data } });
  }
}

async function seedNocRequests(records: NocRecord[], studentIds: Map<string, string>) {
  for (const record of records) {
    const id = demoId("noc", record.slug);
    const startDate = offsetDays(record.startDaysFromNow);
    const data = {
      userId: lookup(studentIds, record.studentSlug, "student", `NOC request "${record.slug}"`),
      company: record.company,
      address: record.address,
      city: record.city,
      state: record.state,
      pincode: record.pincode,
      startDate,
      endDate: offsetDays(record.startDaysFromNow + record.durationDays),
      status: record.status,
      message: record.message ?? null,
      documentUrl: record.documentUrl ?? null,
    };
    await db.nocRequest.upsert({ where: { id }, update: data, create: { id, ...data } });
  }
}

async function seedTeamMembers(records: TeamRecord[]) {
  for (const record of records) {
    const id = demoId("team", record.slug);
    const data = {
      name: record.name,
      role: record.role,
      email: record.email ?? null,
      phone: record.phone ?? null,
      displayOrder: record.displayOrder,
    };
    await db.teamMember.upsert({ where: { id }, update: data, create: { id, ...data } });
  }
}

async function main() {
  const zip = openArchive();
  const adminId = await resolveAdministratorId();

  const companies = readEntry<CompanyRecord[]>(zip, "companies.json");
  const students = readEntry<StudentRecord[]>(zip, "students.json");
  const jobs = readEntry<JobRecord[]>(zip, "job-profiles.json");
  const applications = readEntry<ApplicationRecord[]>(zip, "applications.json");
  const announcements = readEntry<AnnouncementRecord[]>(zip, "announcements.json");
  const feedback = readEntry<FeedbackRecord[]>(zip, "feedback.json");
  const nocRequests = readEntry<NocRecord[]>(zip, "noc-requests.json");
  const teamMembers = readEntry<TeamRecord[]>(zip, "team-members.json");

  const companyIds = await seedCompanies(companies);
  const studentIds = await seedStudents(students);
  const jobIds = await seedJobs(jobs, companyIds, adminId);
  await seedApplications(applications, studentIds, jobIds);
  await seedAnnouncements(announcements, companyIds, adminId);
  await seedFeedback(feedback, studentIds);
  await seedNocRequests(nocRequests, studentIds);
  await seedTeamMembers(teamMembers);

  console.log("Seeded the demonstration dataset from seed-data.zip:");
  console.log(`  companies      ${companies.length}`);
  console.log(`  students       ${students.length}`);
  console.log(`  job profiles   ${jobs.length}`);
  console.log(`  applications   ${applications.length}`);
  console.log(`  announcements  ${announcements.length}`);
  console.log(`  feedback       ${feedback.length}`);
  console.log(`  NOC requests   ${nocRequests.length}`);
  console.log(`  team members   ${teamMembers.length}`);
  console.log('Remove it again with "npm run db:remove-demo".');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
