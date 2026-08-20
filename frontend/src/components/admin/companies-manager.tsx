"use client";

import { Building2, Edit3, ExternalLink, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteCompany, saveCompany, type CompanyActionResult } from "@/app/admin/companies/actions";

export type AdminCompanyItem = {
  id: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  jobCount: number;
  activeJobCount: number;
  createdAt: string;
};

export function CompaniesManager({ companies }: { companies: AdminCompanyItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminCompanyItem | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CompanyActionResult>({});
  const visible = useMemo(
    () => companies.filter((company) => `${company.name} ${company.website ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    [companies, query],
  );

  async function submit(formData: FormData) {
    setSaving(true);
    const nextResult = await saveCompany(formData);
    setResult(nextResult);
    setSaving(false);
    if (nextResult.success) {
      setEditing(undefined);
      router.refresh();
    }
  }

  async function remove(formData: FormData) {
    const nextResult = await deleteCompany(formData);
    setResult(nextResult);
    if (nextResult.success) router.refresh();
  }

  return <div className="admin-page"><section className="admin-heading"><div><span className="eyebrow">Management</span><h1>Companies</h1><p>Create recruiter profiles before publishing their job opportunities.</p></div><button onClick={() => { setResult({}); setEditing(null); }}><Plus/>Add company</button></section>{result.success ? <div className="admin-success">{result.success}</div> : null}{result.error ? <div className="admin-error">{result.error}</div> : null}<section className="admin-toolbar"><label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search companies"/></label></section><section className="admin-table"><div className="admin-row admin-row-head"><span>Company</span><span>Website</span><span>Job profiles</span><span>Created</span><span>Actions</span></div>{visible.map((company) => <div className="admin-row" key={company.id}><span className="company-admin-name"><i><Building2/></i><span><strong>{company.name}</strong><small>{company.description || "No description"}</small></span></span><span>{company.website ? <a className="admin-external-link" href={company.website} target="_blank" rel="noreferrer">Open website <ExternalLink/></a> : "Not provided"}</span><span><strong>{company.jobCount}</strong> total · {company.activeJobCount} active</span><span>{new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(company.createdAt))}</span><span className="row-actions"><button title={`Edit ${company.name}`} onClick={() => { setResult({}); setEditing(company); }}><Edit3/></button><form action={remove}><input type="hidden" name="companyId" value={company.id}/><button title={company.jobCount ? "Remove job profiles before deleting" : `Delete ${company.name}`} disabled={company.jobCount > 0}><Trash2/></button></form></span></div>)}{!visible.length ? <div className="admin-empty"><Building2/><h2>{companies.length ? "No matching companies" : "No companies yet"}</h2><p>{companies.length ? "Change the search query." : "Use Add company to create the first real recruiter record."}</p></div> : null}</section>{editing !== undefined ? <div className="modal-backdrop"><form className="modal" action={submit}><header><div><span className="eyebrow">Company record</span><h2>{editing ? "Edit company" : "Add company"}</h2></div><button type="button" onClick={() => setEditing(undefined)}><X/></button></header><input type="hidden" name="id" value={editing?.id ?? ""}/><div className="form-grid"><label className="wide">Company name<input name="name" required minLength={2} maxLength={120} defaultValue={editing?.name ?? ""} placeholder="Example Technologies"/></label><label>Website<input name="website" type="url" defaultValue={editing?.website ?? ""} placeholder="https://example.com"/></label><label>Logo URL<input name="logoUrl" type="url" defaultValue={editing?.logoUrl ?? ""} placeholder="https://example.com/logo.png"/></label><label className="wide">Description<textarea name="description" rows={5} maxLength={2000} defaultValue={editing?.description ?? ""} placeholder="Short recruiter profile and industry overview"/></label></div><footer><button type="button" onClick={() => setEditing(undefined)}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create company"}</button></footer></form></div> : null}</div>;
}
