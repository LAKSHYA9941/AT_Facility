import { FastifyRequest, FastifyReply } from "fastify";
import { KycService } from "./kyc.service";
import { DocumentType } from "../../shared/types/enums";
import { JWTPayload } from "../../shared/types";
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
} from "../../shared/utils/response";

const kycService = new KycService();

export class KycController {
  uploadDocument = async (
    req: FastifyRequest<{ Params: { docType: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const user = req.user as JWTPayload;
      const { docType } = req.params;

      if (!Object.values(DocumentType).includes(docType as DocumentType)) {
        return sendError(
          reply,
          `Invalid document type. Allowed: ${Object.values(DocumentType).join(", ")}`,
        );
      }

      const data = await kycService.generateUploadUrl(
        user.userId,
        docType as DocumentType,
      );

      return sendSuccess(reply, data, "Upload URL generated successfully");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  submitKyc = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const data = await kycService.submitKyc(user.userId);
      return sendSuccess(reply, data, "KYC submitted successfully");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  getStatus = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const data = await kycService.getKycStatus(user.userId);
      return sendSuccess(reply, data, "KYC status retrieved");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };
}
