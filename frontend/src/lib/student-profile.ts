export type EligibilityProfile = {
  cgpa: number;
  batch: number;
  branch: string;
  backlogs: number;
  bans: number;
  documentsComplete: boolean;
};

export type ProfileCompletionInput = {
  name: string | null;
  rollNumber: string | null;
  branch: string | null;
  batch: number | null;
  degree: string | null;
  personalEmail: string | null;
  contactNumber: string | null;
  currentAddress: string | null;
  class10Percent: number | null;
  class12Percent: number | null;
  cgpa: number | null;
};

const COMPLETION_FIELDS = [
  "name",
  "rollNumber",
  "branch",
  "batch",
  "degree",
  "personalEmail",
  "contactNumber",
  "currentAddress",
  "class10Percent",
  "class12Percent",
  "cgpa",
] as const;

export function calculateProfileCompletion(profile: ProfileCompletionInput) {
  const completed = COMPLETION_FIELDS.filter((field) => {
    const value = profile[field];
    return value !== null && value !== "";
  }).length;

  return Math.round((completed / COMPLETION_FIELDS.length) * 100);
}

export function toEligibilityProfile(
  profile: {
    cgpa: number | null;
    batch: number | null;
    branch: string | null;
    backlogs: number;
    bans: number;
    aadhaarEncrypted: string | null;
    panCardEncrypted: string | null;
  },
  resumeCount: number,
): EligibilityProfile | null {
  if (profile.cgpa === null || profile.batch === null || !profile.branch) {
    return null;
  }

  return {
    cgpa: profile.cgpa,
    batch: profile.batch,
    branch: profile.branch,
    backlogs: profile.backlogs,
    bans: profile.bans,
    documentsComplete: Boolean(
      profile.aadhaarEncrypted && profile.panCardEncrypted && resumeCount > 0,
    ),
  };
}
