import { AlertCircle, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { studentEmailDomain } from "@/lib/auth-access";

function describeError(code: string | undefined, domain: string) {
  if (!code) return null;
  if (code === "AccessDenied") {
    return {
      title: "That account cannot access this portal",
      body: `Sign in with your institute Google account ending in @${domain}. External accounts are only accepted when the placement office has added them as administrators.`,
    };
  }
  if (code === "OAuthAccountNotLinked") {
    return {
      title: "This email is already registered another way",
      body: "Sign in using the provider you originally used for this email address.",
    };
  }
  if (code === "Configuration") {
    return {
      title: "Sign-in is not configured correctly",
      body: "Google credentials are missing or invalid on the server. Contact the placement office.",
    };
  }
  return {
    title: "Sign-in could not be completed",
    body: "Something went wrong while contacting Google. Please try again.",
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) redirect(session.user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard");

  const domain = studentEmailDomain();
  const problem = describeError((await searchParams).error, domain);

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand"><Image src="/iiitl-emblem.png" alt="" width={44} height={35} priority /><span>IIIT Lucknow</span></div>
        <div>
          <span className="eyebrow">Training &amp; Placement Cell</span>
          <h1>Your career journey,<br />all in one place.</h1>
          <p>Discover opportunities, manage applications, and stay connected with the placement cell.</p>
        </div>
        <small>Indian Institute of Information Technology Lucknow</small>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="login-icon"><ShieldCheck /></div>
          <span className="eyebrow">Student portal</span>
          <h2>Welcome back</h2>
          <p>Sign in with your institute Google account. Your account is created automatically on first sign-in.</p>
          {problem ? (
            <div className="login-alert" role="alert">
              <AlertCircle />
              <span><strong>{problem.title}</strong>{problem.body}</span>
            </div>
          ) : null}
          <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboard" }); }}>
            <button type="submit"><span className="google-g">G</span>Continue with Google</button>
          </form>
          <div className="login-note">
            Students sign in with <strong>@{domain}</strong> accounts.<br />
            Administrator access is granted only to addresses configured by the placement office.
          </div>
        </div>
      </section>
    </main>
  );
}
