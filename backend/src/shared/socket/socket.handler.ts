import { Socket } from "socket.io";
import { logger } from "../logger/logger";
import { SOCKET_EVENTS } from "./socket.events";

/**
 * Wraps a socket event handler with error catching and safe emission back to the client.
 */
export const safeSocketHandler = (
  socket: Socket,
  eventName: string,
  handler: (...args: any[]) => Promise<void> | void,
) => {
  return async (...args: any[]) => {
    try {
      await handler(...args);
    } catch (error: any) {
      logger.error(
        { event: eventName, error: error.message },
        "Socket Event Error",
      );
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: error.message || "An unexpected error occurred",
        event: eventName,
      });
    }
  };
};
