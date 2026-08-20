import { notFound } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, CalendarDays, CheckCircle2, IndianRupee, MapPin, XCircle } from "lucide-react";
import Link from "next/link";
import { ApplyButton } from "@/components/jobs/apply-button";
import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { db } from "@/lib/db";
import { evaluateEligibility, isEligible } from "@/lib/eligibility";
import { companyColor, companyInitials, formatPortalDate, jobTypeLabel } from "@/lib/job-presenters";
import { toEligibilityProfile } from "@/lib/student-profile";
import { requireStudent } from "@/lib/student-session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await requireStudent();
  const job = await db.jobProfile.findFirst({
    where: { id, status: { not: "DRAFT" } },
    include: { company: true },
  });
  if (!job) notFound();

  const [resumeCount, existingApplication] = student.user
    ? await Promise.all([
        db.resume.count({ where: { userId: student.user.id } }),
        db.application.findUnique({
          where: {
            userId_jobProfileId: {
              userId: student.user.id,
              jobProfileId: job.id,
            },
          },
        }),
      ])
    : [0, null];
  const profile = student.user ? toEligibilityProfile(student.user, resumeCount) : null;
  const checks = profile
    ? evaluateEligibility(profile, {
        minCgpa: job.minCGPA,
        batch: job.batch,
        branches: job.allowedBranches,
        maxBacklogs: job.maxBacklogs,
        maxBans: job.maxBans,
      })
    : [];
  const applicationOpen = job.status === "ACTIVE" && job.registrationDeadline > new Date();
  const eligible = Boolean(profile && applicationOpen && isEligible(checks));
  const disabledReason = !student.user
    ? "Google sign-in required"
    : !profile
      ? "Complete your profile"
      : !applicationOpen
        ? "Applications closed"
        : !eligible
          ? "Not currently eligible"
          : undefined;
  const compensation = job.ctcStipendInfo ?? (job.ctcStipend === null
    ? "Not specified"
    : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(job.ctcStipend));

  return <AuthenticatedPortalShell><div className="job-detail"><Link className="back-link" href="/company-events"><ArrowLeft/>Back to opportunities</Link><div className="job-detail-grid"><article className="job-main"><div className="job-hero"><div className="detail-logo" style={{ background: companyColor(job.company.name) }}>{companyInitials(job.company.name)}</div><div><span>{job.company.name}</span><h1>{job.title}</h1><b>{jobTypeLabel(job.type)}</b></div></div><div className="job-facts"><div><MapPin/><span>Location<strong>{job.locations.join(" / ") || "Not specified"}</strong></span></div><div><IndianRupee/><span>Compensation<strong>{compensation}</strong></span></div><div><CalendarDays/><span>Deadline<strong>{formatPortalDate(job.registrationDeadline, true)}</strong></span></div><div><BriefcaseBusiness/><span>Batch<strong>{job.batch}</strong></span></div></div><section><h2>Opening overview</h2><p>{job.openingOverview ?? job.description ?? "No additional description has been published."}</p></section><section><h2>Eligibility criteria</h2><dl><div><dt>Minimum CGPA</dt><dd>{job.minCGPA}</dd></div><div><dt>Maximum backlogs</dt><dd>{job.maxBacklogs}</dd></div><div><dt>Allowed branches</dt><dd>{job.allowedBranches.join(", ") || "All branches"}</dd></div></dl></section></article><aside className="eligibility-card"><span className="eyebrow">Automatic evaluation</span><h2>{profile ? (eligible ? "You are eligible" : "Not currently eligible") : "Complete your profile"}</h2><p>{profile ? "Calculated from your saved student profile." : "Add academic details to calculate eligibility for this role."}</p>{checks.length ? <div>{checks.map(check => <span className={check.pass ? "pass" : "fail"} key={check.key}>{check.pass ? <CheckCircle2/> : <XCircle/>}{check.label}</span>)}</div> : null}<ApplyButton jobId={job.id} disabledReason={disabledReason} alreadyApplied={Boolean(existingApplication)}/><small>Applications are saved to your account and are visible only to you and authorized placement administrators.</small></aside></div></div></AuthenticatedPortalShell>;
}
