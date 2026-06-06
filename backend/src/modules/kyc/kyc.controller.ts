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
    req: FastifyRequest<{
      Params: { docType: string };
      Querystring: { documentNumber?: string };
      Body: { documentNumber?: string };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const user = req.user as JWTPayload;
      const { docType } = req.params;
      const documentNumber =
        req.query.documentNumber || (req.body as any)?.documentNumber;

      if (!Object.values(DocumentType).includes(docType as DocumentType)) {
        return sendError(
          reply,
          `Invalid document type. Allowed: ${Object.values(DocumentType).join(", ")}`,
        );
      }

      const data = await kycService.generateUploadUrl(
        user.userId,
        docType as DocumentType,
        documentNumber,
      );

      return sendSuccess(reply, data, "Upload URL generated successfully");
    } catch (err: any) {
      return sendError(reply, err.message);
    }
  };

  submitKyc = async (
    req: FastifyRequest<{
      Body: {
        name?: string;
        bankIFSC?: string;
        bankAccountName?: string;
        aadhaarNumber?: string;
        dlNumber?: string;
        rcNumber?: string;
        panNumber?: string;
      };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const user = req.user as JWTPayload;
      const data = await kycService.submitKyc(user.userId, req.body || {});
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
