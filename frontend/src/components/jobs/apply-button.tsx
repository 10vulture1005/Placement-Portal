"use client";

import { Check, FileText } from "lucide-react";
import { useActionState, useState } from "react";
import { applyToJob, type ApplyState } from "@/app/company-events/actions";

export type ResumeOption = {
  id: string;
  label: string;
  fileName: string;
};

const initialState: ApplyState = {};

export function ApplyButton({
  jobId,
  disabledReason,
  alreadyApplied,
  resumes = [],
}: {
  jobId: string;
  disabledReason?: string;
  alreadyApplied: boolean;
  resumes?: ResumeOption[];
}) {
  const [state, action, pending] = useActionState(applyToJob, initialState);
  const [selectedResume, setSelectedResume] = useState<string>(
    resumes.length ? resumes[0].id : "",
  );
  const applied = alreadyApplied || Boolean(state.success);

  return (
    <form action={action} className="apply-form">
      <input type="hidden" name="jobId" value={jobId} />

      {!applied && !disabledReason && resumes.length > 0 ? (
        <div style={{ marginBottom: "12px", display: "grid", gap: "6px" }}>
          <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", display: "flex", alignItems: "center", gap: "5px" }}>
            <FileText style={{ width: "13px", height: "13px" }} />
            Submit with Resume:
          </label>
          <select
            name="resumeId"
            value={selectedResume}
            onChange={(e) => setSelectedResume(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--card-bg)",
              color: "var(--ink)",
              fontSize: "11px",
              width: "100%",
            }}
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} ({r.fileName})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="resumeId" value={selectedResume} />
      )}

      <button
        className={`apply-button ${applied ? "applied" : ""}`}
        disabled={Boolean(disabledReason) || applied || pending}
      >
        {applied ? (
          <>
            <Check />
            Application submitted
          </>
        ) : pending ? (
          "Submitting…"
        ) : (
          disabledReason ?? "Apply"
        )}
      </button>
      {state.error ? <small className="action-error">{state.error}</small> : null}
    </form>
  );
}

