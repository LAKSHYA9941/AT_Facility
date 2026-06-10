import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@atfacility.com" },
    update: {
      phone: "9999999999",
    },
    create: {
      phone: "9999999999",
      email: process.env.ADMIN_EMAIL || "admin@atfacility.com",
      name: "AT Facility Admin",
      role: "ADMIN",
      profileComplete: true,
      status: "ACTIVE",
    },
  });

  console.log(`Admin created: ${admin.phone}`);

  // Seed packages
  await prisma.package.createMany({
    skipDuplicates: true,
    data: [
      {
        title: "Maldives Retreat",
        subtitle: "Overwater paradise in the Indian Ocean",
        description:
          "Experience luxury overwater bungalows with crystal clear waters",
        category: "BEACH",
        price: 129900,
        durationDays: 5,
        maxPeople: 2,
        inclusions: [
          "Return flights",
          "4-star overwater villa",
          "Daily breakfast",
          "Snorkeling gear",
        ],
        exclusions: ["Visa fees", "Personal expenses", "Scuba diving charges"],
        itinerary: JSON.stringify([
          {
            day: 1,
            title: "Arrival & Settle In",
            description: "Airport pickup, check-in, sunset dinner",
          },
          {
            day: 2,
            title: "Water Adventures",
            description: "Snorkeling, dolphin cruise",
          },
          {
            day: 3,
            title: "Island Hopping",
            description: "Visit local islands, fish market",
          },
          {
            day: 4,
            title: "Spa & Relaxation",
            description: "Couple spa, sunset fishing",
          },
          {
            day: 5,
            title: "Departure",
            description: "Breakfast, checkout, airport drop",
          },
        ]),
        imageUrls: [
          "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800",
        ],
      },
      {
        title: "Swiss Alps Adventure",
        subtitle: "Peak luxury in the heart of Europe",
        description:
          "Experience the majestic Swiss Alps with luxury accommodation",
        category: "HILLS",
        price: 240000,
        durationDays: 7,
        maxPeople: 4,
        inclusions: [
          "Return flights",
          "5-star chalet",
          "All meals",
          "Ski pass",
          "Equipment rental",
        ],
        exclusions: ["Personal shopping", "Optional excursions"],
        itinerary: JSON.stringify([
          {
            day: 1,
            title: "Arrival Zurich",
            description: "Airport pickup, train to chalet",
          },
          {
            day: 2,
            title: "Skiing - Beginner Slopes",
            description: "Morning lesson, afternoon free ski",
          },
          {
            day: 3,
            title: "Advanced Slopes",
            description: "Full day skiing with guide",
          },
          {
            day: 4,
            title: "Jungfraujoch",
            description: "Top of Europe day trip",
          },
          {
            day: 5,
            title: "Interlaken",
            description: "Adventure sports, paragliding",
          },
          {
            day: 6,
            title: "Lucerne Day Trip",
            description: "Old town, Chapel Bridge, lake cruise",
          },
          {
            day: 7,
            title: "Departure",
            description: "Checkout, train to Zurich, flight home",
          },
        ]),
        imageUrls: [
          "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800",
        ],
      },
    ],
  });

  console.log("Packages seeded");
  console.log("\nSeed complete!");
  console.log(`\nAdmin credentials:`);
  console.log(`  Phone: 9999999999`);
  console.log(`  Role:  ADMIN`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
