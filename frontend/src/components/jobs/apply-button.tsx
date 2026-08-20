"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { applyToJob, type ApplyState } from "@/app/company-events/actions";

const initialState: ApplyState = {};

export function ApplyButton({
  jobId,
  disabledReason,
  alreadyApplied,
}: {
  jobId: string;
  disabledReason?: string;
  alreadyApplied: boolean;
}) {
  const [state, action, pending] = useActionState(applyToJob, initialState);
  const applied = alreadyApplied || Boolean(state.success);

  return (
    <form action={action}>
      <input type="hidden" name="jobId" value={jobId} />
      <button className={`apply-button ${applied ? "applied" : ""}`} disabled={Boolean(disabledReason) || applied || pending}>
        {applied ? <><Check />Application submitted</> : pending ? "Submitting…" : disabledReason ?? "Apply"}
      </button>
      {state.error ? <small className="action-error">{state.error}</small> : null}
    </form>
  );
}
