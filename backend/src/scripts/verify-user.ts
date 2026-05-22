import {
  PrismaClient,
  Role,
  KYCStatus,
  VehicleSegment,
  UserStatus,
} from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const prisma = new PrismaClient();

function printHelp() {
  console.log(`
At Facility - Manual User Verification Utility
==============================================
Usage:
  npx tsx src/scripts/verify-user.ts --phone <phone_number> --role <CUSTOMER|DRIVER> [--segment <HATCHBACK|SEDAN|MINI_SUV|SUV|TEMPO>]

Arguments:
  --phone       User phone number (with or without +91)
  --role        Role to assign/verify (CUSTOMER or DRIVER)
  --segment     (Optional for DRIVER) Vehicle segment to assign to the driver

Examples:
  npx tsx src/scripts/verify-user.ts --phone 9876543210 --role CUSTOMER
  npx tsx src/scripts/verify-user.ts --phone 9999911111 --role DRIVER --segment SUV
  `);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    printHelp();
    return;
  }

  let phone = "";
  let roleInput = "";
  let segmentInput = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--phone" && args[i + 1]) {
      phone = args[i + 1];
    } else if (args[i] === "--role" && args[i + 1]) {
      roleInput = args[i + 1].toUpperCase();
    } else if (args[i] === "--segment" && args[i + 1]) {
      segmentInput = args[i + 1].toUpperCase();
    }
  }

  if (!phone) {
    console.error("❌ Error: Missing --phone argument.");
    printHelp();
    process.exit(1);
  }

  if (!roleInput || (roleInput !== "CUSTOMER" && roleInput !== "DRIVER")) {
    console.error(
      "❌ Error: Missing or invalid --role argument. Must be CUSTOMER or DRIVER.",
    );
    printHelp();
    process.exit(1);
  }

  // Format phone to match stored format if needed
  // The system uses formatPhone, but let's try to query by exact match and formatted version (+91...)
  let cleanPhone = phone.trim();
  if (!cleanPhone.startsWith("+")) {
    if (cleanPhone.length === 10) {
      cleanPhone = `+91${cleanPhone}`;
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith("91")) {
      cleanPhone = `+${cleanPhone}`;
    }
  }

  console.log(`Searching for user with phone: ${cleanPhone}...`);

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ phone: cleanPhone }, { phone: phone.trim() }],
    },
  });

  if (!user) {
    console.log(
      `⚠️ User not found. Creating a new user record for ${cleanPhone}...`,
    );
    user = await prisma.user.create({
      data: {
        phone: cleanPhone,
        role: roleInput as Role,
        status: UserStatus.ACTIVE,
        profileComplete: true,
        name: `Test ${roleInput.toLowerCase()}`,
        email: `${roleInput.toLowerCase()}.${Date.now()}@test.com`,
      },
    });
  }

  // Perform updates
  if (roleInput === "CUSTOMER") {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: Role.CUSTOMER,
        idVerified: true,
        idVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
      },
    });

    console.log(`\n🎉 Success! Customer verified successfully.`);
    console.log(`-------------------------------------------`);
    console.log(`ID:        ${updatedUser.id}`);
    console.log(`Name:      ${updatedUser.name}`);
    console.log(`Phone:     ${updatedUser.phone}`);
    console.log(`Role:      ${updatedUser.role}`);
    console.log(`Verified:  ${updatedUser.idVerified ? "YES ✓" : "NO"}`);
    console.log(`Status:    ${updatedUser.status}`);
  } else if (roleInput === "DRIVER") {
    let segment: VehicleSegment = VehicleSegment.HATCHBACK;
    if (segmentInput) {
      if (Object.values(VehicleSegment).includes(segmentInput as any)) {
        segment = segmentInput as VehicleSegment;
      } else {
        console.warn(
          `⚠️ Warning: Invalid segment "${segmentInput}". Defaulting to HATCHBACK.`,
        );
      }
    } else {
      console.log("ℹ️ No segment provided. Defaulting to HATCHBACK.");
    }

    // Ensure User role is updated to DRIVER
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: Role.DRIVER,
        status: UserStatus.ACTIVE,
      },
    });

    // Ensure DriverProfile exists and is VERIFIED
    const driverProfile = await prisma.driverProfile.upsert({
      where: { userId: user.id },
      update: {
        kycStatus: KYCStatus.VERIFIED,
        segment: segment,
        isOnline: true,
        isAvailable: true,
      },
      create: {
        userId: user.id,
        kycStatus: KYCStatus.VERIFIED,
        segment: segment,
        isOnline: true,
        isAvailable: true,
      },
    });

    console.log(
      `\n🎉 Success! Driver verified & profile activated successfully.`,
    );
    console.log(
      `-------------------------------------------------------------`,
    );
    console.log(`User ID:     ${user.id}`);
    console.log(`Profile ID:  ${driverProfile.id}`);
    console.log(`Phone:       ${user.phone}`);
    console.log(`Role:        DRIVER`);
    console.log(`KYC Status:  ${driverProfile.kycStatus} ✓`);
    console.log(`Segment:     ${driverProfile.segment}`);
    console.log(`Status:      Online & Available`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Execution error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
