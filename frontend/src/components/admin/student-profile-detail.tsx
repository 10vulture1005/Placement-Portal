import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, FileText, GraduationCap, IdCard, Mail, UserRound } from "lucide-react";

export type AdminStudentDetail = {
  name: string;
  email: string;
  rollNumber: string | null;
  personalEmail: string | null;
  contactNumber: string | null;
  altContactNumber: string | null;
  branch: string | null;
  batch: number | null;
  degree: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  currentAddress: string | null;
  class10Percent: number | null;
  class12Percent: number | null;
  cgpa: number | null;
  backlogs: number;
  bans: number;
  profileCompletion: number;
  aadhaarProvided: boolean;
  panProvided: boolean;
  resumes: Array<{ id: string; label: string; fileName: string; uploadedAt: string }>;
  applications: Array<{ id: string; company: string; role: string; status: string; appliedAt: string }>;
};

function value(value: string | number | null) {
  return value === null || value === "" ? "Not provided" : String(value);
}

export function StudentProfileDetail({ student }: { student: AdminStudentDetail }) {
  return <div className="admin-page"><Link className="back-link" href="/admin/students"><ArrowLeft/>Back to students</Link><section className="admin-profile-banner"><div><span className="eyebrow">Student record</span><h1>{student.name}</h1><p>{student.email}</p></div><strong>{student.profileCompletion}% profile complete</strong></section><section className="admin-profile-grid"><article><header><UserRound/><div><h2>Personal details</h2><p>Identity and academic directory fields</p></div></header><dl><div><dt>Roll number</dt><dd>{value(student.rollNumber)}</dd></div><div><dt>Gender</dt><dd>{value(student.gender)}</dd></div><div><dt>Date of birth</dt><dd>{value(student.dateOfBirth)}</dd></div><div><dt>Blood group</dt><dd>{value(student.bloodGroup)}</dd></div><div><dt>Current address</dt><dd>{value(student.currentAddress)}</dd></div></dl></article><article><header><GraduationCap/><div><h2>Academic details</h2><p>Current saved eligibility inputs</p></div></header><dl><div><dt>Branch</dt><dd>{value(student.branch)}</dd></div><div><dt>Degree</dt><dd>{value(student.degree)}</dd></div><div><dt>Batch</dt><dd>{value(student.batch)}</dd></div><div><dt>Class 10</dt><dd>{student.class10Percent === null ? "Not provided" : `${student.class10Percent}%`}</dd></div><div><dt>Class 12</dt><dd>{student.class12Percent === null ? "Not provided" : `${student.class12Percent}%`}</dd></div><div><dt>CGPA</dt><dd>{value(student.cgpa)}</dd></div><div><dt>Backlogs</dt><dd>{student.backlogs}</dd></div><div><dt>Placement bans</dt><dd>{student.bans}</dd></div></dl></article><article><header><Mail/><div><h2>Contact details</h2><p>Saved communication information</p></div></header><dl><div><dt>Institute email</dt><dd>{student.email}</dd></div><div><dt>Personal email</dt><dd>{value(student.personalEmail)}</dd></div><div><dt>Phone</dt><dd>{value(student.contactNumber)}</dd></div><div><dt>Alternate phone</dt><dd>{value(student.altContactNumber)}</dd></div></dl></article><article><header><IdCard/><div><h2>Documents</h2><p>Presence only; sensitive values are never displayed</p></div></header><dl><div><dt>Aadhaar</dt><dd>{student.aadhaarProvided ? "Provided" : "Not provided"}</dd></div><div><dt>PAN</dt><dd>{student.panProvided ? "Provided" : "Not provided"}</dd></div><div><dt>Resumes</dt><dd>{student.resumes.length}</dd></div></dl></article></section><section className="admin-detail-section"><header><FileText/><div><h2>Resumes</h2><p>Uploaded file metadata</p></div></header>{student.resumes.length ? student.resumes.map((resume) => <div className="admin-detail-row" key={resume.id}><span><strong>{resume.label}</strong><small>{resume.fileName}</small></span><span>{resume.uploadedAt}</span></div>) : <div className="admin-empty compact"><FileText/><h2>No resumes</h2><p>This student has not uploaded a resume.</p></div>}</section><section className="admin-detail-section"><header><BriefcaseBusiness/><div><h2>Applications</h2><p>Roles submitted by this student</p></div></header>{student.applications.length ? student.applications.map((application) => <div className="admin-detail-row" key={application.id}><span><strong>{application.company} · {application.role}</strong><small>{application.appliedAt}</small></span><b className="cell-status">{application.status}</b></div>) : <div className="admin-empty compact"><BriefcaseBusiness/><h2>No applications</h2><p>This student has not applied to a role.</p></div>}</section></div>;
}
