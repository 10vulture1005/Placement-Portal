import { BriefcaseBusiness, Building2, CheckCircle2, GraduationCap, TrendingUp, Users } from "lucide-react";

export type AdminDashboardData = {
  students: number;
  companies: number;
  activeJobs: number;
  offers: number;
  placementRate: number;
  applicationCounts: { total: number; shortlisted: number; interviews: number; selected: number };
  branches: Array<{ name: string; value: number; placed: number; students: number }>;
  recentApplications: Array<{ id: string; student: string; role: string; company: string; status: string; date: string }>;
};

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  return <div className="admin-page"><section className="admin-heading"><div><span className="eyebrow">Live database</span><h1>Placement overview</h1><p>Operational totals from current portal records.</p></div></section><section className="admin-metrics"><article><span className="metric-icon blue"><GraduationCap/></span><div><small>Registered students</small><strong>{data.students}</strong><b>Authenticated records</b></div></article><article><span className="metric-icon orange"><Building2/></span><div><small>Partner companies</small><strong>{data.companies}</strong><b>{data.activeJobs} active drives</b></div></article><article><span className="metric-icon green"><CheckCircle2/></span><div><small>Offers received</small><strong>{data.offers}</strong><b>Selected applications</b></div></article><article><span className="metric-icon violet"><TrendingUp/></span><div><small>Placement rate</small><strong>{data.placementRate}%</strong><b>Registered students</b></div></article></section><section className="analytics-grid"><article><header><div><h2>Branch-wise placement</h2><p>Selected students among registered branch records</p></div><Users/></header>{data.branches.length ? <div className="bar-chart">{data.branches.map((item) => <div key={item.name}><span>{item.name}</span><i><b style={{ width: `${item.value}%` }}/></i><strong>{item.value}%</strong></div>)}</div> : <div className="admin-empty compact"><Users/><h2>No branch data</h2><p>Branch statistics appear after students complete their profiles.</p></div>}</article><article><header><div><h2>Application funnel</h2><p>Current stored applications</p></div><BriefcaseBusiness/></header><div className="funnel"><span><b>{data.applicationCounts.total}</b>Applications</span><span><b>{data.applicationCounts.shortlisted}</b>Shortlisted</span><span><b>{data.applicationCounts.interviews}</b>Interviewed</span><span><b>{data.applicationCounts.selected}</b>Selected</span></div></article></section><section className="recent-admin"><header><div><h2>Recent applications</h2><p>Latest student submissions and status changes</p></div></header>{data.recentApplications.length ? data.recentApplications.map((application) => <div key={application.id}><i/><span><strong>{application.student} · {application.company} · {application.role}</strong><small>{application.status} · {application.date}</small></span></div>) : <div className="admin-empty compact"><BriefcaseBusiness/><h2>No applications yet</h2><p>New student applications will appear here.</p></div>}</section></div>;
}
