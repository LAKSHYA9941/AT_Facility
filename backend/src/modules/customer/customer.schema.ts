export const uploadIdProofSchema = {
  body: {
    type: "object",
    required: ["idProofType", "side"],
    properties: {
      idProofType: { type: "string" },
      side: { type: "string", enum: ["front", "back", "single"] },
    },
  },
};

export const confirmIdProofSchema = {
  body: {
    type: "object",
    required: ["idProofType", "frontKey"],
    properties: {
      idProofType: { type: "string" },
      frontKey: { type: "string" },
      backKey: { type: "string" },
    },
  },
};
