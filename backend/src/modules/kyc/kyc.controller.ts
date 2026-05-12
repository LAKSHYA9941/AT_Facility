import { FastifyRequest, FastifyReply } from "fastify";
import { KycService } from "./kyc.service";
import { DocumentType } from "../../shared/types/enums";
import { JWTPayload } from "../../shared/types";

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
        return reply.status(400).send({
          success: false,
          message: `Invalid document type. Allowed types: ${Object.values(DocumentType).join(", ")}`,
          data: null,
        });
      }

      const result = await kycService.generateUploadUrl(
        user.userId,
        docType as DocumentType,
      );

      return reply.send({
        success: true,
        message: "Upload URL generated successfully",
        data: result,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || "Failed to generate upload URL",
        data: null,
      });
    }
  };

  submitKyc = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      await kycService.submitKyc(user.userId);

      return reply.send({
        success: true,
        message: "KYC submitted successfully",
        data: null,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || "Failed to submit KYC",
        data: null,
      });
    }
  };

  getStatus = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = req.user as JWTPayload;
      const status = await kycService.getKycStatus(user.userId);

      return reply.send({
        success: true,
        message: "KYC status retrieved successfully",
        data: status,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || "Failed to get KYC status",
        data: null,
      });
    }
  };
}
