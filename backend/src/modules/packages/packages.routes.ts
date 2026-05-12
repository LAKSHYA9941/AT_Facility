import { FastifyInstance } from "fastify";
import { PackagesController } from "./packages.controller";
import { authGuard } from "../../shared/middleware/auth.guard";
import { roleGuard } from "../../shared/middleware/role.guard";
import { Role, PackageCategory } from "../../shared/types/enums";

export async function packagesRoutes(fastify: FastifyInstance) {
  const packagesController = new PackagesController();
  const customerPreHandler = {
    preHandler: [authGuard, roleGuard(Role.CUSTOMER)],
  };

  fastify.get(
    "/bookings/my",
    customerPreHandler,
    packagesController.getMyBookings,
  );
  fastify.put<{ Params: { id: string } }>(
    "/bookings/:id/cancel",
    customerPreHandler,
    packagesController.cancelBooking,
  );

  fastify.get<{ Querystring: { category?: PackageCategory } }>(
    "/",
    customerPreHandler,
    packagesController.listPackages,
  );
  fastify.get<{ Params: { id: string } }>(
    "/:id",
    customerPreHandler,
    packagesController.getPackage,
  );
  fastify.post<{
    Params: { id: string };
    Body: { travelDate: string; numPeople: number };
  }>("/:id/book", customerPreHandler, packagesController.bookPackage);
}
