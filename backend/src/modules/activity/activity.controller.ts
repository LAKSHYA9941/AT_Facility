// backend/src/modules/activity/activity.controller.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { fetchActivityFeed } from "./activity.service";
import { sendSuccess, sendError } from "../../shared/utils/response";

export async function getActivityFeed(
  _req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const feed = await fetchActivityFeed();
    return sendSuccess(reply, feed, "Activity feed fetched");
  } catch (err: any) {
    return sendError(reply, err.message);
  }
}
