import { Building2, Mail, MapPin, Phone } from "lucide-react";

export type PublicTeamMember = {
  id?: string;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  displayOrder?: number;
};

const defaultFallbackTeam: PublicTeamMember[] = [
  { name: "Dr. Arun Mohan Sherry", role: "Director", email: "director@iiitl.ac.in", phone: "+91 522 415 4201" },
  { name: "Dr. Pradeep Kumar", role: "Faculty In-charge, Placements", email: "tnp.faculty@iiitl.ac.in", phone: "+91 522 415 4201" },
  { name: "Ananya Verma", role: "Student Placement Coordinator", email: "placements@iiitl.ac.in", phone: "+91 522 415 4201" },
  { name: "Rohan Gupta", role: "Student Placement Coordinator", email: "placements@iiitl.ac.in", phone: "+91 522 415 4201" },
];

export function TeamView({
  members,
  contact = false,
}: {
  members?: PublicTeamMember[];
  contact?: boolean;
}) {
  const displayTeam = (members && members.length > 0) ? members : defaultFallbackTeam;

  return (
    <div className="module-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">
            {contact ? "Get in touch" : "People behind placements"}
          </span>
          <h1>{contact ? "Contact the placement cell" : "Our team"}</h1>
          <p>
            {contact
              ? "We are here to help students and recruiting partners."
              : "Meet the faculty and student coordinators supporting your career journey."}
          </p>
        </div>
      </section>

      {contact ? (
        <section className="contact-grid">
          <article>
            <Mail />
            <h2>Email</h2>
            <a href="mailto:placements@iiitl.ac.in">placements@iiitl.ac.in</a>
            <p>For placement drives and general queries</p>
          </article>
          <article>
            <Phone />
            <h2>Phone</h2>
            <a href="tel:+915224154201">+91 522 415 4201</a>
            <p>Monday–Friday, 9:30 AM–5:30 PM</p>
          </article>
          <article>
            <MapPin />
            <h2>Office</h2>
            <address>
              Training &amp; Placement Cell
              <br />
              IIIT Lucknow, Chak Ganjaria
              <br />
              Lucknow, Uttar Pradesh 226002
            </address>
          </article>
        </section>
      ) : (
        <section className="team-grid">
          {displayTeam.map((member, index) => {
            const initials = member.name
              .split(" ")
              .map((s) => s[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase() || "TM";

            const emailHref = member.email ? `mailto:${member.email}` : "mailto:placements@iiitl.ac.in";
            const phoneHref = member.phone ? `tel:${member.phone.replace(/[^+\d]/g, "")}` : "tel:+915224154201";

            return (
              <article key={member.id || member.name}>
                {member.photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="member-avatar object-cover mx-auto"
                  />
                ) : (
                  <div className={`member-avatar tone-${index % 5}`}>{initials}</div>
                )}
                <h2>{member.name}</h2>
                <span>{member.role}</span>
                <div>
                  <a href={emailHref}>
                    <Mail />
                    Email
                  </a>
                  <a href={phoneHref}>
                    <Phone />
                    Call
                  </a>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="recruiter-card">
        <Building2 />
        <div>
          <h2>Recruiting at IIIT Lucknow?</h2>
          <p>
            Connect with our placement office for campus engagement, internship, and full-time hiring opportunities.
          </p>
        </div>
        <a href="mailto:placements@iiitl.ac.in">Contact placement office</a>
      </section>
    </div>
  );
}
