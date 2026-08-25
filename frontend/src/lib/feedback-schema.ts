import { z } from "zod";

export const feedbackSubmitSchema = z.object({
  feedbackType: z.enum(["QUERY", "FEEDBACK", "COMPLAINT"], {
    message: "Please select a valid message type.",
  }),
  subject: z
    .string()
    .trim()
    .min(5, "Subject must be at least 5 characters.")
    .max(150, "Subject must not exceed 150 characters."),
  message: z
    .string()
    .trim()
    .min(20, "Message must be at least 20 characters.")
    .max(4000, "Message must not exceed 4000 characters."),
});

export const feedbackReplySchema = z.object({
  feedbackId: z.string().min(1, "Feedback ID is required."),
  adminResponse: z
    .string()
    .trim()
    .min(2, "Response message must be at least 2 characters.")
    .max(4000, "Response must not exceed 4000 characters."),
  resolve: z.boolean().default(true),
});

export const feedbackDeleteSchema = z.object({
  feedbackId: z.string().min(1, "Feedback ID is required."),
});

export type FeedbackSubmitData = z.infer<typeof feedbackSubmitSchema>;
export type FeedbackReplyData = z.infer<typeof feedbackReplySchema>;
export type FeedbackDeleteData = z.infer<typeof feedbackDeleteSchema>;
