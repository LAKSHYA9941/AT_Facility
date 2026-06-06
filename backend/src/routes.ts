import { FastifyInstance } from "fastify";
import { authRoutes } from "./modules/auth/auth.routes";
import { kycRoutes } from "./modules/kyc/kyc.routes";
import { adminRoutes } from "./modules/admin/admin.routes";
import { packagesRoutes } from "./modules/packages/packages.routes";
import { rentalsRoutes } from "./modules/rentals/rentals.routes";
import { paymentsRoutes } from "./modules/payments/payments.routes";
import { notificationsRoutes } from "./modules/notifications/notifications.routes";
import { tripsRoutes } from "./modules/trips/trips.routes";
import { customerRoutes } from "./modules/customer/customer.routes";
import { driverRoutes } from "./modules/driver/driver.routes";
import { activityRoutes } from "./modules/activity/activity.routes";
import { customPlanRoutes } from "./modules/custom-plans/custom-plans.routes";

export const registerRoutes = async (app: FastifyInstance) => {
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(kycRoutes, { prefix: "/api/kyc" });
  app.register(adminRoutes, { prefix: "/api/admin" });
  app.register(packagesRoutes, { prefix: "/api/packages" });
  app.register(rentalsRoutes, { prefix: "/api/rentals" });
  app.register(paymentsRoutes, { prefix: "/api/payments" });
  app.register(notificationsRoutes, { prefix: "/api/notifications" });
  app.register(tripsRoutes, { prefix: "/api/trips" });
  app.register(customerRoutes, { prefix: "/api/customer" });
  app.register(driverRoutes, { prefix: "/api/driver" });
  app.register(activityRoutes, { prefix: "/api" });
  app.register(customPlanRoutes, { prefix: "/api" });
};
