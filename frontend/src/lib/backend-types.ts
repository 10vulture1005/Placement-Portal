/**
 * Response shapes returned by the FastAPI service. These mirror the Pydantic
 * models in backend/app/schemas and keep the client calls typed while data
 * access is being moved out of the frontend.
 */

export type BackendProfile = {
  id: string;
  email: string | null;
  name: string | null;
  rollNumber: string | null;
  personalEmail: string | null;
  contactNumber: string | null;
  altContactNumber: string | null;
  branch: string | null;
  degree: string | null;
  batch: number | null;
  gender: string | null;
  bloodGroup: string | null;
  /** ISO-8601 timestamp. */
  dateOfBirth: string | null;
  currentAddress: string | null;
  class10Percent: number | null;
  class12Percent: number | null;
  cgpa: number | null;
  backlogs: number | null;
  aadhaarEncrypted?: string | null;
  aadhaarProvided?: boolean;
  aadhaarMasked?: string | null;
  aadhaarDocProvided?: boolean;
  aadhaarDocFileName?: string | null;
  panCardEncrypted?: string | null;
  panProvided?: boolean;
  panMasked?: string | null;
  panDocProvided?: boolean;
  panDocFileName?: string | null;
};

export type BackendResume = {
  id: string;
  label: string;
  fileUrl: string;
  fileName: string;
  /** ISO-8601 timestamp. */
  uploadedAt: string;
};

export type BackendFeedback = {
  id: string;
  feedbackType: string;
  content: string;
  resolved: boolean;
  adminResponse: string | null;
  createdAt: string;
};
