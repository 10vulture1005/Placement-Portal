"use client";

import { BriefcaseBusiness, Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  deleteJobProfile,
  saveJobProfile,
  type JobProfileActionResult,
} from "@/app/admin/job-profiles/actions";

export type AdminJobProfileItem = {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  type: "INTERNSHIP" | "FTE" | "INTERNSHIP_PPO" | "INTERNSHIP_FTE";
  locations: string[];
  ctcStipend: number | null;
  ctcStipendInfo: string | null;
  minCGPA: number;
  maxBacklogs: number;
  maxBans: number;
  allowedBranches: string[];
  allowedDegrees: string[];
  allowedGenders: string[];
  jobCategory: string | null;
  batch: number;
  registrationDeadline: string;
  status: "DRAFT" | "ACTIVE" | "ENDED";
  description: string | null;
  openingOverview: string | null;
  applicationCount: number;
};

type CompanyOption = { id: string; name: string };

const typeLabels: Record<AdminJobProfileItem["type"], string> = {
  INTERNSHIP: "Internship",
  FTE: "FTE",
  INTERNSHIP_PPO: "Internship + PPO",
  INTERNSHIP_FTE: "Internship + FTE",
};

function localDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function JobProfilesManager({
  jobs,
  companies,
  canPersist,
}: {
  jobs: AdminJobProfileItem[];
  companies: CompanyOption[];
  canPersist: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [editing, setEditing] = useState<AdminJobProfileItem | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<JobProfileActionResult>({});
  const visible = useMemo(
    () => jobs.filter((job) => {
      const matchesSearch = `${job.companyName} ${job.title} ${job.locations.join(" ")}`.toLowerCase().includes(query.toLowerCase());
      return matchesSearch && (status === "ALL" || job.status === status);
    }),
    [jobs, query, status],
  );

  async function submit(formData: FormData) {
    setSaving(true);
    const nextResult = await saveJobProfile(formData);
    setResult(nextResult);
    setSaving(false);
    if (nextResult.success) {
      setEditing(undefined);
      router.refresh();
    }
  }

  async function remove(formData: FormData) {
    const nextResult = await deleteJobProfile(formData);
    setResult(nextResult);
    if (nextResult.success) router.refresh();
  }

  const createDisabledReason = !canPersist
    ? "Sign in with a Google administrator account to publish persistent jobs."
    : !companies.length
      ? "Add a company before creating its job profile."
      : null;

  return (
    <div className="admin-page">
      <section className="admin-heading">
        <div><span className="eyebrow">Opportunity management</span><h1>Job profiles</h1><p>Create roles, eligibility rules, deadlines, and publishing status.</p></div>
        <button disabled={Boolean(createDisabledReason)} title={createDisabledReason ?? "Add job profile"} onClick={() => { setResult({}); setEditing(null); }}><Plus/>Add job profile</button>
      </section>
      {createDisabledReason ? <div className="admin-info">{createDisabledReason}</div> : null}
      {result.success ? <div className="admin-success">{result.success}</div> : null}
      {result.error ? <div className="admin-error">{result.error}</div> : null}
      <section className="admin-toolbar">
        <label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, role, or location"/></label>
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ENDED">Ended</option></select>
      </section>
      <section className="admin-table">
        <div className="admin-row admin-row-head"><span>Role</span><span>Eligibility</span><span>Deadline</span><span>Applications</span><span>Actions</span></div>
        {visible.map((job) => <div className="admin-row" key={job.id}>
          <span className="company-admin-name"><i><BriefcaseBusiness/></i><span><strong>{job.companyName} · {job.title}</strong><small>{typeLabels[job.type]} · {job.locations.join(" / ")}</small></span></span>
          <span>Batch {job.batch} · CGPA {job.minCGPA}+<br/><small>{job.allowedBranches.join(", ")}</small></span>
          <span><b className={`cell-status ${job.status.toLowerCase()}`}>{job.status}</b><br/><small>{new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(job.registrationDeadline))}</small></span>
          <span>{job.applicationCount}</span>
          <span className="row-actions"><button title={`Edit ${job.title}`} disabled={!canPersist} onClick={() => { setResult({}); setEditing(job); }}><Edit3/></button><form action={remove}><input type="hidden" name="jobProfileId" value={job.id}/><button title={job.applicationCount ? "Jobs with applications cannot be deleted" : `Delete ${job.title}`} disabled={!canPersist || job.applicationCount > 0}><Trash2/></button></form></span>
        </div>)}
        {!visible.length ? <div className="admin-empty"><BriefcaseBusiness/><h2>{jobs.length ? "No matching job profiles" : "No job profiles yet"}</h2><p>{jobs.length ? "Change the search or status filter." : "Add a company, then publish its first real opportunity."}</p></div> : null}
      </section>
      {editing !== undefined ? <div className="modal-backdrop"><form className="modal job-profile-modal" action={submit}>
        <header><div><span className="eyebrow">Persistent opportunity</span><h2>{editing ? "Edit job profile" : "Add job profile"}</h2></div><button type="button" onClick={() => setEditing(undefined)}><X/></button></header>
        <input type="hidden" name="id" value={editing?.id ?? ""}/>
        <div className="form-grid">
          <label className="wide">Company<select name="companyId" required defaultValue={editing?.companyId ?? ""}><option value="" disabled>Select a company</option>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
          <label>Role title<input name="title" required minLength={2} maxLength={160} defaultValue={editing?.title ?? ""} placeholder="Software Engineer"/></label>
          <label>Opportunity type<select name="type" defaultValue={editing?.type ?? "FTE"}>{Object.entries(typeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>Locations<input name="locations" required defaultValue={editing?.locations.join(", ") ?? ""} placeholder="Bengaluru, Remote"/></label>
          <label>Batch<input name="batch" type="number" required min={2020} max={2100} defaultValue={editing?.batch ?? new Date().getFullYear() + 1}/></label>
          <label>Minimum CGPA<input name="minCGPA" type="number" required min={0} max={10} step="0.01" defaultValue={editing?.minCGPA ?? 0}/></label>
          <label>Maximum backlogs<input name="maxBacklogs" type="number" required min={0} step="1" defaultValue={editing?.maxBacklogs ?? 0}/></label>
          <label>Maximum placement bans<input name="maxBans" type="number" required min={0} step="1" defaultValue={editing?.maxBans ?? 0}/></label>
          <label>CTC / stipend amount<input name="ctcStipend" type="number" min={0} step="any" defaultValue={editing?.ctcStipend ?? ""} placeholder="1800000"/></label>
          <label className="wide">Compensation note<input name="ctcStipendInfo" maxLength={500} defaultValue={editing?.ctcStipendInfo ?? ""} placeholder="₹18 LPA total CTC or ₹50,000/month"/></label>
          <label className="wide">Allowed branches (comma-separated)<input name="allowedBranches" required defaultValue={editing?.allowedBranches.join(", ") ?? ""} placeholder="CSE, IT, CSAI"/></label>
          <label>Allowed degrees<input name="allowedDegrees" required defaultValue={editing?.allowedDegrees.join(", ") ?? ""} placeholder="B.Tech, M.Tech"/></label>
          <label>Allowed genders (optional)<input name="allowedGenders" defaultValue={editing?.allowedGenders.join(", ") ?? ""} placeholder="Leave blank for all"/></label>
          <label>Job category<input name="jobCategory" maxLength={100} defaultValue={editing?.jobCategory ?? ""} placeholder="Engineering"/></label>
          <label>Registration deadline<input name="registrationDeadline" type="datetime-local" required defaultValue={editing ? localDateTime(editing.registrationDeadline) : ""}/></label>
          <label>Publishing status<select name="status" defaultValue={editing?.status ?? "DRAFT"}><option value="DRAFT">Draft — hidden from students</option><option value="ACTIVE">Active — visible and open</option><option value="ENDED">Ended — visible but closed</option></select></label>
          <label className="wide">Short description<textarea name="description" rows={3} maxLength={5000} defaultValue={editing?.description ?? ""} placeholder="A short summary shown to students"/></label>
          <label className="wide">Opening overview<textarea name="openingOverview" rows={6} maxLength={10000} defaultValue={editing?.openingOverview ?? ""} placeholder="Role responsibilities, hiring process, and other details"/></label>
        </div>
        <footer><button type="button" onClick={() => setEditing(undefined)}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create job profile"}</button></footer>
      </form></div> : null}
    </div>
  );
}

