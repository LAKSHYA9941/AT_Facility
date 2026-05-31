import { z } from "zod/v4";

export const uploadIdProofSchema = {
  body: z.object({
    idProofType: z.string(),
    side: z.enum(["front", "back", "single"]),
  }),
};

export const confirmIdProofSchema = {
  body: z.object({
    idProofType: z.string(),
    frontKey: z.string(),
    backKey: z.string().optional(),
  }),
};
