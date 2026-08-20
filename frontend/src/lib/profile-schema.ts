import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((value) => value || null);
const optionalEmail = z
  .union([z.literal(""), z.string().trim().email()])
  .transform((value) => value || null);
const optionalNumber = (minimum: number, maximum: number, integer = false) =>
  z.preprocess(
    (value) => value === "" ? null : Number(value),
    (integer ? z.number().int() : z.number()).min(minimum).max(maximum).nullable(),
  );
const optionalDate = z.preprocess(
  (value) => value === "" ? null : new Date(String(value)),
  z.date().max(new Date()).nullable(),
);

export const studentProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  rollNumber: optionalText(30),
  personalEmail: optionalEmail,
  contactNumber: optionalText(20),
  altContactNumber: optionalText(20),
  branch: optionalText(50),
  degree: optionalText(50),
  batch: optionalNumber(2000, 2100, true),
  gender: optionalText(30),
  bloodGroup: optionalText(10),
  dateOfBirth: optionalDate,
  currentAddress: optionalText(500),
  class10Percent: optionalNumber(0, 100),
  class12Percent: optionalNumber(0, 100),
  cgpa: optionalNumber(0, 10),
  backlogs: optionalNumber(0, 100, true).transform((value) => value ?? 0),
});

export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
