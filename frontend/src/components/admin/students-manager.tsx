"use client";

import Link from "next/link";
import { Eye, GraduationCap, Search } from "lucide-react";
import { useMemo, useState } from "react";

export type AdminStudentListItem = {
  id: string;
  name: string;
  email: string;
  rollNumber: string | null;
  branch: string | null;
  batch: number | null;
  cgpa: number | null;
  completion: number;
  applicationCount: number;
};

export function StudentsManager({ students }: { students: AdminStudentListItem[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => students.filter((student) => `${student.name} ${student.email} ${student.rollNumber ?? ""} ${student.branch ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    [students, query],
  );

  return <div className="admin-page"><section className="admin-heading"><div><span className="eyebrow">Live student records</span><h1>Students</h1><p>Profiles created through authenticated institute Google accounts.</p></div></section><section className="admin-toolbar"><label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, roll number, or branch"/></label></section><section className="admin-table"><div className="admin-row admin-row-head"><span>Student</span><span>Academic profile</span><span>CGPA</span><span>Applications</span><span>Actions</span></div>{visible.map((student) => <div className="admin-row" key={student.id}><span className="company-admin-name"><i><GraduationCap/></i><span><strong>{student.name}</strong><small>{student.email}</small></span></span><span>{student.rollNumber ?? "Roll not added"}<br/><small>{student.branch ?? "Branch not added"}{student.batch ? ` · ${student.batch}` : ""} · {student.completion}% complete</small></span><span>{student.cgpa ?? "Not added"}</span><span>{student.applicationCount}</span><span className="row-actions"><Link className="admin-icon-link" href={`/admin/students/${student.id}`} title={`View ${student.name}`}><Eye/></Link></span></div>)}{!visible.length ? <div className="admin-empty"><GraduationCap/><h2>{students.length ? "No matching students" : "No students yet"}</h2><p>{students.length ? "Change the search query." : "Students appear after their first institute Google sign-in."}</p></div> : null}</section></div>;
}
