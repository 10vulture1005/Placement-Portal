import { Construction } from "lucide-react";

type Config = { title: string; description: string; nextStep: string };

const configs: Record<string, Config> = {
  announcements: { title: "Announcements", description: "Publish opportunities and placement updates.", nextStep: "Persistent announcement publishing is not implemented yet." },
  jobs: { title: "Job profiles", description: "Configure roles, deadlines, and eligibility criteria.", nextStep: "Add at least one company first. Persistent job creation is the next admin phase." },
  applications: { title: "Applications", description: "Review candidates and update application outcomes.", nextStep: "Student applications are stored, but the administrator review table is not implemented yet." },
  students: { title: "Students", description: "Search student records, eligibility, and placement status.", nextStep: "Authenticated students exist in the database; the administrator directory is not implemented yet." },
  feedbacks: { title: "Feedbacks", description: "Respond to student queries and complaints.", nextStep: "Student feedback is stored; the administrator response workflow is not implemented yet." },
  noc: { title: "NOC requests", description: "Approve requests and upload signed certificates.", nextStep: "Persistent NOC requests are not implemented yet." },
  team: { title: "Placement team", description: "Manage the public team directory and coordinators.", nextStep: "Team member management is not implemented yet." },
  settings: { title: "System settings", description: "Manage administrators and portal configuration.", nextStep: "Administrators are currently managed through the ADMIN_EMAILS environment allowlist." },
};

export function AdminManager({ kind }: { kind: string }) {
  const config = configs[kind];
  return <div className="admin-page"><section className="admin-heading"><div><span className="eyebrow">Management</span><h1>{config.title}</h1><p>{config.description}</p></div></section><section className="admin-empty"><Construction/><h2>No placeholder records</h2><p>{config.nextStep}</p></section></div>;
}
