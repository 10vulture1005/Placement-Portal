"use client";

import { Check, FileText, GraduationCap, IdCard, Mail, Pencil, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { updateStudentProfile, type ProfileUpdateResult } from "@/app/profile/actions";

type ProfileValues = {
  name: string;
  rollNumber: string;
  personalEmail: string;
  contactNumber: string;
  altContactNumber: string;
  branch: string;
  degree: string;
  batch: string;
  gender: string;
  bloodGroup: string;
  dateOfBirth: string;
  currentAddress: string;
  class10Percent: string;
  class12Percent: string;
  cgpa: string;
  backlogs: string;
};

export type StudentProfileViewData = {
  canPersist: boolean;
  initials: string;
  completion: number;
  email: string;
  values: ProfileValues;
  identityDocuments: { aadhaarProvided: boolean; panProvided: boolean };
  resumes: Array<{ id: string; label: string; name: string; uploadedAt: string }>;
};

const personalFields: Array<[keyof ProfileValues, string, string]> = [
  ["name", "Full name", "text"],
  ["dateOfBirth", "Date of birth", "date"],
  ["gender", "Gender", "text"],
  ["bloodGroup", "Blood group", "text"],
];
const academicFields: Array<[keyof ProfileValues, string, string]> = [
  ["rollNumber", "Roll number", "text"],
  ["branch", "Branch", "text"],
  ["degree", "Degree", "text"],
  ["batch", "Graduation year", "number"],
  ["class10Percent", "Class 10 %", "number"],
  ["class12Percent", "Class 12 %", "number"],
  ["cgpa", "Current CGPA", "number"],
  ["backlogs", "Active backlogs", "number"],
];
const contactFields: Array<[keyof ProfileValues, string, string]> = [
  ["personalEmail", "Personal email", "email"],
  ["contactNumber", "Phone", "tel"],
  ["altContactNumber", "Alternate phone", "tel"],
  ["currentAddress", "Current address", "text"],
];

export function ProfileView({ profile }: { profile: StudentProfileViewData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ProfileUpdateResult>({});
  const [form, setForm] = useState(profile.values);

  function update(key: keyof ProfileValues, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !dirty || saving) return;
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    const nextResult = await updateStudentProfile(formData);
    setResult(nextResult);
    setSaving(false);
    if (nextResult.success) {
      setEditing(false);
      setDirty(false);
      router.refresh();
    }
  }

  function renderFields(fields: Array<[keyof ProfileValues, string, string]>) {
    return fields.map(([key, label, type]) => (
      <label className={key === "currentAddress" ? "wide" : ""} key={key}>
        {label}
        <input
          name={key}
          type={type}
          disabled={!editing}
          value={form[key]}
          step={type === "number" ? "any" : undefined}
          placeholder="Not provided"
          onChange={(event) => update(key, event.target.value)}
        />
        {result.fieldErrors?.[key]?.[0] ? <small className="field-error">{result.fieldErrors[key][0]}</small> : null}
      </label>
    ));
  }

  return (
    <form className="module-page profile-page" onSubmit={save}>
      <section className="profile-banner">
        <div className="profile-avatar">{profile.initials}</div>
        <div>
          <span className="eyebrow">Student profile</span>
          <h1>{form.name}</h1>
          <p>{form.rollNumber || "Roll number not added"} · {form.branch || "Branch not added"} · {form.batch ? `Batch of ${form.batch}` : "Batch not added"}</p>
        </div>
        <div className="completion">
          <strong>{profile.completion}%</strong><span>Profile complete</span><i><b style={{ width: `${profile.completion}%` }}/></i>
        </div>
        {profile.canPersist ? editing ? (
          <button type="submit" disabled={saving || !dirty}><Save/>{saving ? "Saving…" : dirty ? "Save changes" : "Change a field"}</button>
        ) : (
          <button type="button" onClick={() => { setResult({}); setDirty(false); setEditing(true); }}><Pencil/>Edit profile</button>
        ) : null}
      </section>
      {!profile.canPersist ? <div className="profile-notice">Development credential data is intentionally not stored. Sign in with Google to maintain a real profile.</div> : null}
      {result.success ? <div className="save-message"><Check/>{result.success}</div> : null}
      {result.error ? <div className="profile-error">{result.error}</div> : null}
      <section className="profile-grid">
        <article><header><UserRound/><div><h2>Personal details</h2><p>Your identity and contact information</p></div></header><div className="form-grid">{renderFields(personalFields)}</div></article>
        <article><header><GraduationCap/><div><h2>Academic details</h2><p>Current program and performance</p></div></header><div className="form-grid">{renderFields(academicFields)}</div></article>
        <article><header><Mail/><div><h2>Contact information</h2><p>How the placement team reaches you</p></div></header><div className="form-grid"><label>Institute email<input disabled value={profile.email}/></label>{renderFields(contactFields)}</div></article>
        <article className="documents-card"><header><IdCard/><div><h2>Identity documents</h2><p>Sensitive values are encrypted before storage</p></div></header><div><span><IdCard/>Aadhaar card <b className={profile.identityDocuments.aadhaarProvided ? "" : "missing"}>{profile.identityDocuments.aadhaarProvided ? "Provided" : "Not provided"}</b></span><span><FileText/>PAN card <b className={profile.identityDocuments.panProvided ? "" : "missing"}>{profile.identityDocuments.panProvided ? "Provided" : "Not provided"}</b></span></div></article>
        <article className="resumes-card"><header><FileText/><div><h2>Resumes</h2><p>Your uploaded PDF resumes</p></div></header><div>{profile.resumes.length ? profile.resumes.map((resume) => <span key={resume.id}><i><FileText/></i><span><strong>{resume.label}</strong><small>{resume.name} · Uploaded {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(resume.uploadedAt))}</small></span></span>) : <div className="empty"><FileText/><h3>No resumes uploaded</h3><p>Resume upload storage is the next setup step.</p></div>}</div></article>
      </section>
    </form>
  );
}
