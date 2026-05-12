import { FastifyInstance } from "fastify";
import { RentalsController, CreateRentalBody } from "./rentals.controller";
import { authGuard } from "../../shared/middleware/auth.guard";
import { roleGuard } from "../../shared/middleware/role.guard";
import { Role } from "../../shared/types/enums";

export async function rentalsRoutes(fastify: FastifyInstance) {
  const rentalsController = new RentalsController();
  const customerPreHandler = {
    preHandler: [authGuard, roleGuard(Role.CUSTOMER)],
  };

  fastify.get(
    "/vehicles",
    customerPreHandler,
    rentalsController.getAvailableVehicles,
  );
  fastify.post<{ Body: CreateRentalBody }>(
    "/create",
    customerPreHandler,
    rentalsController.createRental,
  );
  fastify.get("/my", customerPreHandler, rentalsController.getMyRentals);
  fastify.put<{ Params: { id: string } }>(
    "/:id/cancel",
    customerPreHandler,
    rentalsController.cancelRental,
  );
}
