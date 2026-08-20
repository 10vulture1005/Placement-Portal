"use client";

import { Download, FileBadge, FileText, Plus, ShieldAlert, X } from "lucide-react";
import { useState, useTransition } from "react";
import { submitNocRequest } from "@/app/forms/actions";

const downloads = [
  { name: "Placement Policy 2026–27", size: "1.2 MB" },
  { name: "Student Resume Template", size: "84 KB" },
  { name: "Internship Undertaking Form", size: "210 KB" },
];
export type LocalNoc = { id: string; company: string; startDate: string; endDate: string; status: string };

export function FormsView({ initialNocs = [] }: { initialNocs?: LocalNoc[] }) {
  const [tab, setTab] = useState("guidelines");
  const [modal, setModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    startTransition(async () => {
      const result = await submitNocRequest(formData);
      if (!result?.error) {
        setModal(false);
      } else {
        alert(result.error);
      }
    });
  }

  return <div className="module-page"><section className="page-heading"><div><span className="eyebrow">Resources</span><h1>Forms & documents</h1><p>Placement guidelines, NOC requests, and official downloads.</p></div></section><div className="tabs">{[["guidelines", "T&P guidelines"], ["noc", "NOC requests"], ["downloads", "Downloads"]].map(([id, label]) => <button className={tab === id ? "active" : ""} onClick={() => setTab(id)} key={id}>{label}</button>)}</div>{tab === "guidelines" && <section className="guidelines"><div className="notice"><ShieldAlert/><div><strong>Read before applying</strong><p>Participation in placement activities indicates acceptance of the institute placement policy.</p></div></div><h2>Student placement guidelines</h2><ol><li>Keep your academic and contact information accurate at all times.</li><li>Apply only after reviewing the complete role description and eligibility criteria.</li><li>Attendance in registered tests and interviews is mandatory unless formally excused.</li><li>Misrepresentation of academic or personal information may result in a placement ban.</li><li>Communicate with recruiters only through the designated placement coordinators.</li><li>Report off-campus offers to the Training & Placement Cell promptly.</li></ol></section>}{tab === "noc" && <section className="noc-section"><div className="notice warning"><ShieldAlert/><div><strong>Important academic notice</strong><p>An NOC grants permission for training but does not waive attendance, credits, examinations, or other academic requirements.</p></div></div><div className="section-action"><div><h2>Your NOC requests</h2></div><button onClick={() => setModal(true)}><Plus/>Request NOC</button></div>{initialNocs.length ? <div className="simple-table"><div><b>Company</b><b>Training period</b><b>Status</b><b>Document</b></div>{initialNocs.map(noc => <div key={noc.id}><span>{noc.company}</span><span>{new Date(noc.startDate).toLocaleDateString()} – {new Date(noc.endDate).toLocaleDateString()}</span><span><i>{noc.status}</i></span><span>Not available</span></div>)}</div> : <div className="empty"><FileBadge/><h3>No NOC requests</h3><p>You have not made any NOC requests.</p></div>}</section>}{tab === "downloads" && <section className="downloads"><h2>Official documents</h2>{downloads.map(file => <article key={file.name}><FileText/><div><strong>{file.name}</strong><span>PDF · {file.size}</span></div><button><Download/>Download</button></article>)}</section>}{modal && <div className="modal-backdrop"><form className="modal" action={handleAction}><header><div><span className="eyebrow">New request</span><h2>Request an NOC</h2></div><button type="button" onClick={() => setModal(false)}><X/></button></header><div className="form-grid"><label>Company name<input name="company" required/></label><label>City<input name="city" required/></label><label className="wide">Company address<input name="address" required/></label><label>Start date<input name="startDate" required type="date"/></label><label>End date<input name="endDate" required type="date"/></label><label>State<input name="state" required/></label><label>Pincode<input name="pincode" required pattern="[0-9]{6}"/></label></div><footer><button type="button" onClick={() => setModal(false)}>Cancel</button><button type="submit" disabled={isPending}><FileBadge/>{isPending ? "Submitting..." : "Submit request"}</button></footer></form></div>}</div>;
}
