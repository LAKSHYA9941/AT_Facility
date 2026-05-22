import { Server as SocketServer } from "socket.io";
import { createServer } from "http";
import { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { SOCKET_EVENTS } from "./socket.events";
import { LocationRedis } from "../redis/redis";
import prisma from "../db/prisma";
import { JWTPayload } from "../types";
import { Role } from "../types/enums";

export let io: SocketServer;

export const setIO = (instance: SocketServer) => {
  io = instance;
};
