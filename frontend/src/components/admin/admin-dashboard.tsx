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
  const total = data.applicationCounts.total || 0;
  const calcPct = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

  return (
    <div className="admin-page">
      <section className="admin-heading">
        <div>
          <span className="eyebrow">Live database</span>
          <h1>Placement overview</h1>
          <p>Operational totals from current portal records.</p>
        </div>
      </section>

      <section className="admin-metrics">
        <article>
          <span className="metric-icon blue"><GraduationCap /></span>
          <div>
            <small>Registered students</small>
            <strong>{data.students}</strong>
            <b>Authenticated records</b>
          </div>
        </article>
        <article>
          <span className="metric-icon orange"><Building2 /></span>
          <div>
            <small>Partner companies</small>
            <strong>{data.companies}</strong>
            <b>{data.activeJobs} active drives</b>
          </div>
        </article>
        <article>
          <span className="metric-icon green"><CheckCircle2 /></span>
          <div>
            <small>Offers received</small>
            <strong>{data.offers}</strong>
            <b>Selected applications</b>
          </div>
        </article>
        <article>
          <span className="metric-icon violet"><TrendingUp /></span>
          <div>
            <small>Placement rate</small>
            <strong>{data.placementRate}%</strong>
            <b>Registered students</b>
          </div>
        </article>
      </section>

      <section className="analytics-grid">
        <article>
          <header>
            <div>
              <h2>Branch-wise placement</h2>
              <p>Selected students among registered branch records</p>
            </div>
            <Users />
          </header>
          {data.branches.length ? (
            <div className="bar-chart">
              {data.branches.map((item) => (
                <div key={item.name}>
                  <span>{item.name}</span>
                  <i><b style={{ width: `${item.value}%` }} /></i>
                  <strong>{item.value}%</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty compact">
              <Users />
              <h2>No branch data</h2>
              <p>Branch statistics appear after students complete their profiles.</p>
            </div>
          )}
        </article>

        <article>
          <header>
            <div>
              <h2>Application funnel</h2>
              <p>Current stored applications by stage</p>
            </div>
            <BriefcaseBusiness />
          </header>
          <div className="funnel">
            <div className="funnel-row stage-total">
              <div className="funnel-row-header">
                <div className="funnel-stage">
                  <span className="funnel-stage-indicator" />
                  <span>Applications</span>
                </div>
                <div className="funnel-stat">
                  <strong className="funnel-count">{data.applicationCounts.total}</strong>
                  <span className="funnel-percent">{total > 0 ? "100%" : "0%"}</span>
                </div>
              </div>
              <div className="funnel-track">
                <div className="funnel-bar" style={{ width: total > 0 ? "100%" : "0%" }} />
              </div>
            </div>

            <div className="funnel-row stage-shortlisted">
              <div className="funnel-row-header">
                <div className="funnel-stage">
                  <span className="funnel-stage-indicator" />
                  <span>Shortlisted</span>
                </div>
                <div className="funnel-stat">
                  <strong className="funnel-count">{data.applicationCounts.shortlisted}</strong>
                  <span className="funnel-percent">{calcPct(data.applicationCounts.shortlisted)}%</span>
                </div>
              </div>
              <div className="funnel-track">
                <div
                  className="funnel-bar"
                  style={{
                    width: `${total > 0 && data.applicationCounts.shortlisted > 0 ? Math.max(6, calcPct(data.applicationCounts.shortlisted)) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="funnel-row stage-interview">
              <div className="funnel-row-header">
                <div className="funnel-stage">
                  <span className="funnel-stage-indicator" />
                  <span>Interviewed</span>
                </div>
                <div className="funnel-stat">
                  <strong className="funnel-count">{data.applicationCounts.interviews}</strong>
                  <span className="funnel-percent">{calcPct(data.applicationCounts.interviews)}%</span>
                </div>
              </div>
              <div className="funnel-track">
                <div
                  className="funnel-bar"
                  style={{
                    width: `${total > 0 && data.applicationCounts.interviews > 0 ? Math.max(6, calcPct(data.applicationCounts.interviews)) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="funnel-row stage-selected">
              <div className="funnel-row-header">
                <div className="funnel-stage">
                  <span className="funnel-stage-indicator" />
                  <span>Selected</span>
                </div>
                <div className="funnel-stat">
                  <strong className="funnel-count">{data.applicationCounts.selected}</strong>
                  <span className="funnel-percent">{calcPct(data.applicationCounts.selected)}%</span>
                </div>
              </div>
              <div className="funnel-track">
                <div
                  className="funnel-bar"
                  style={{
                    width: `${total > 0 && data.applicationCounts.selected > 0 ? Math.max(6, calcPct(data.applicationCounts.selected)) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="recent-admin">
        <header>
          <div>
            <h2>Recent applications</h2>
            <p>Latest student submissions and status changes</p>
          </div>
        </header>
        {data.recentApplications.length ? (
          data.recentApplications.map((application) => (
            <div key={application.id}>
              <i />
              <span>
                <strong>
                  {application.student} · {application.company} · {application.role}
                </strong>
                <small>
                  {application.status} · {application.date}
                </small>
              </span>
            </div>
          ))
        ) : (
          <div className="admin-empty compact">
            <BriefcaseBusiness />
            <h2>No applications yet</h2>
            <p>New student applications will appear here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
