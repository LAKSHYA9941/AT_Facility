import { FastifyRequest, FastifyReply } from "fastify";
import { customerService } from "./customer.service";
import { sendSuccess, sendError } from "../../shared/utils/response";
import { JWTPayload } from "../../shared/types";

export const customerController = {
  uploadIdProof: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { idProofType, side } = req.body as {
        idProofType: string;
        side: "front" | "back" | "single";
      };

      const result = await customerService.uploadIdProof(
        user.userId,
        idProofType,
        side,
      );
      return sendSuccess(reply, result, "Upload URL generated");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  confirmIdProof: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const { idProofType, frontKey, backKey } = req.body as {
        idProofType: string;
        frontKey: string;
        backKey?: string;
      };

      const result = await customerService.confirmIdProof(
        user.userId,
        idProofType,
        frontKey,
        backKey,
      );
      return sendSuccess(reply, result, "ID Proof confirmed");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },

  getIdProofStatus: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const result = await customerService.getIdProofStatus(user.userId);
      return sendSuccess(reply, result, "ID Proof status retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  },
};
