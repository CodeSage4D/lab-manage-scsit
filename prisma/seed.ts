import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import dotenv from "dotenv";
import { createHash } from "crypto";

dotenv.config({ path: ".env.local" });

// Setup WebSocket constructor for Neon Serverless
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

function hashValue(val: string): string {
  return createHash("sha256").update(val).digest("hex");
}

async function main() {
  console.log("Seeding started...");

  // 1. Seed default administrative users
  const defaultAdmins = [
    {
      employeeId: "N5428",
      name: "Karan Mishra",
      email: "Karan.mishra@suas.ac.in",
      mobile: "9999999901",
      designation: "Director Admin",
      passwordHash: hashValue("@dn1m@26"),
      pinHash: hashValue("2026"),
    },
    {
      employeeId: "monark.raikwar",
      name: "Monark Raikwar",
      email: "monark.raikwar@suas.ac.in",
      mobile: "9999999902",
      designation: "Lab Assistant",
      passwordHash: hashValue("@dn1m@26"),
      pinHash: hashValue("2026"),
    },
    {
      employeeId: "nitin.panchal",
      name: "Nitin Panchal",
      email: "nitin.panchal@suas.ac.in",
      mobile: "9999999903",
      designation: "Lab Assistant",
      passwordHash: hashValue("@dn1m@26"),
      pinHash: hashValue("2026"),
    },
  ];

  for (const admin of defaultAdmins) {
    await prisma.user.upsert({
      where: { email: admin.email },
      update: {},
      create: admin,
    });
  }
  console.log("Seeded admins.");

  // 2. Seed default labs matching SCSIT configuration
  const defaultLabs = [
    { name: "Lab A", code: "LBA", floor: "1", location: "Computer Center", seatingCapacity: 60, totalComputers: 60, operatingSystem: "Windows 11 / Ubuntu", primaryPurpose: "Computer Center" },
    { name: "Lab B", code: "LBB", floor: "1", location: "Basic Programming - I", seatingCapacity: 30, totalComputers: 30, operatingSystem: "Windows 11", primaryPurpose: "Basic Programming - I" },
    { name: "Lab C", code: "LBC", floor: "1", location: "Basic Programming - II", seatingCapacity: 30, totalComputers: 30, operatingSystem: "Windows 11 / Ubuntu", primaryPurpose: "Basic Programming - II" },
    { name: "Lab D", code: "LBD", floor: "5", location: "Room 505", seatingCapacity: 30, totalComputers: 30, operatingSystem: "Windows 11", primaryPurpose: "Advanced Cloud Computing" },
    { name: "Lab E", code: "LBE", floor: "5", location: "Room 504", seatingCapacity: 30, totalComputers: 30, operatingSystem: "Windows 11 / Ubuntu", primaryPurpose: "Web Technologies" },
  ];

  for (const lab of defaultLabs) {
    await prisma.lab.upsert({
      where: { code: lab.code },
      update: {},
      create: lab,
    });
  }
  console.log("Seeded default labs.");

  // 3. Seed default settings
  const defaultSettings = [
    { key: "installation_status_enabled", value: "true" },
    { key: "active_session", value: "July-Dec 2026" },
    { key: "notice_text", value: "Notice: Software installation requests for the July-December 2026 Academic Session must be submitted before July 15, 2026. Please verify and confirm digital signatures." },
    { key: "faculty_lab_selection_enabled", value: "false" },
    { key: "module_faculty_software_requests", value: "true" },
    { key: "module_laboratory_management", value: "true" },
    { key: "module_laboratory_software_records", value: "true" },
    { key: "module_maintenance_register", value: "true" },
    { key: "module_reports_dashboard", value: "true" },
    { key: "module_laboratory_inventory", value: "false" },
    { key: "module_asset_management", value: "false" },
    { key: "module_notifications", value: "false" },
    { key: "module_naac_documentation", value: "false" },
    { key: "module_ieee_compliance", value: "false" },
    { key: "module_document_repository", value: "false" },
    { key: "module_search_audit_logs", value: "false" },
  ];

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("Seeded settings.");

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
