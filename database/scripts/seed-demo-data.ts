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

interface PersonalActivity {
  profile: {
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
  };
  applications: { jobSlug: string; status: ApplicationStatus; appliedDaysAgo: number }[];
  nocRequests: (Omit<NocRecord, "studentSlug">)[];
  feedback: (Omit<FeedbackRecord, "studentSlug">)[];
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

/**
 * Collects the accounts to attach activity to, from any of:
 *   npm run db:seed:demo -- you@iiitl.ac.in
 *   DEMO_STUDENT_EMAILS="a@x,b@y" npm run db:seed:demo
 *
 * Bare addresses are the documented form because `npm run` claims unknown
 * `--flags` as its own config and never forwards them to the script.
 */
function requestedStudentEmails() {
  const argv = process.argv.slice(2);
  const emails: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--student" && argv[i + 1]) {
      emails.push(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith("--student=")) {
      emails.push(arg.slice("--student=".length));
    } else if (!arg.startsWith("-") && arg.includes("@")) {
      emails.push(arg);
    }
  }

  emails.push(...(process.env.DEMO_STUDENT_EMAILS ?? "").split(","));

  return [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
}

/**
 * Gives a real, signed-in account its own applications, NOC requests, and
 * feedback. The generated students cannot sign in, so without this the student
 * portal is empty for whoever is actually browsing it. Rows still carry `demo-`
 * ids and so are removed by `npm run db:remove-demo`; the account itself is not.
 */
async function seedPersonalActivity(
  emails: string[],
  activity: PersonalActivity,
  jobIds: Map<string, string>,
) {
  let attached = 0;

  for (const email of emails) {
    const user = await db.user.findFirst({
      where: { email },
      select: {
        id: true, email: true, branch: true, degree: true, batch: true, gender: true,
        category: true, contactNumber: true, class10Percent: true, class12Percent: true,
        semGPAs: true, cgpa: true,
      },
    });

    if (!user) {
      console.warn(`  ! no account exists for ${email}. Sign in once with that address, then re-run.`);
      continue;
    }

    // Only fill gaps: never overwrite what a real person entered themselves.
    const p = activity.profile;
    const patch: Record<string, unknown> = {};
    if (user.branch === null) patch.branch = p.branch;
    if (user.degree === null) patch.degree = p.degree;
    if (user.batch === null) patch.batch = currentYear + p.batchOffset;
    if (user.gender === null) patch.gender = p.gender;
    if (user.category === null) patch.category = p.category;
    if (user.contactNumber === null) patch.contactNumber = p.contactNumber;
    if (user.class10Percent === null) patch.class10Percent = p.class10Percent;
    if (user.class12Percent === null) patch.class12Percent = p.class12Percent;
    if (user.cgpa === null) patch.cgpa = p.cgpa;
    if (user.semGPAs.length === 0) patch.semGPAs = p.semGPAs;
    if (Object.keys(patch).length > 0) {
      await db.user.update({ where: { id: user.id }, data: patch });
    }

    for (const record of activity.applications) {
      const jobProfileId = lookup(jobIds, record.jobSlug, "job", `personal activity for ${email}`);
      const appliedAt = offsetDays(-record.appliedDaysAgo);
      await db.application.upsert({
        where: { userId_jobProfileId: { userId: user.id, jobProfileId } },
        update: { status: record.status, appliedAt },
        create: {
          id: demoId("personal-application", `${user.id}-${record.jobSlug}`),
          userId: user.id,
          jobProfileId,
          status: record.status,
          appliedAt,
        },
      });
    }

    for (const record of activity.nocRequests) {
      const id = demoId("personal-noc", `${user.id}-${record.slug}`);
      const data = {
        userId: user.id,
        company: record.company,
        address: record.address,
        city: record.city,
        state: record.state,
        pincode: record.pincode,
        startDate: offsetDays(record.startDaysFromNow),
        endDate: offsetDays(record.startDaysFromNow + record.durationDays),
        status: record.status,
        message: record.message ?? null,
        documentUrl: record.documentUrl ?? null,
      };
      await db.nocRequest.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    for (const record of activity.feedback) {
      const id = demoId("personal-feedback", `${user.id}-${record.slug}`);
      const data = {
        userId: user.id,
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

    const filled = Object.keys(patch).length;
    console.log(
      `  attached to ${email}: ${activity.applications.length} applications, ` +
        `${activity.nocRequests.length} NOC requests, ${activity.feedback.length} feedback` +
        (filled > 0 ? `, and filled ${filled} empty profile field(s)` : ""),
    );
    attached += 1;
  }

  return attached;
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
  const personalActivity = readEntry<PersonalActivity>(zip, "personal-activity.json");
  const studentEmails = requestedStudentEmails();

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

  if (studentEmails.length > 0) {
    console.log("Attaching activity to signed-in accounts:");
    await seedPersonalActivity(studentEmails, personalActivity, jobIds);
  } else {
    console.log(
      "The generated students cannot sign in, so your own student pages stay empty.\n" +
        "Give your account its own applications, NOC requests, and feedback with:\n" +
        "  npm run db:seed:demo -- you@iiitl.ac.in",
    );
  }

  console.log('Remove it again with "npm run db:remove-demo".');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
