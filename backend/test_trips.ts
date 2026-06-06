import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const trips = await prisma.trip.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { driver: { include: { user: true, vehicle: true } } },
  });
  console.log(
    JSON.stringify(
      trips.map((t) => ({
        id: t.id,
        status: t.status,
        driverId: t.driverId,
        driverName: t.driver?.user?.name,
        driver: t.driver,
      })),
      null,
      2,
    ),
  );
}
main();
