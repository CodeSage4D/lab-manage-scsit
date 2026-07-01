import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import dotenv from "dotenv";
import { createHash } from "crypto";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

function hashValue(val: string): string {
  if (!val) return "";
  return createHash("sha256").update(val + "scsit_suas_secure_salt_2026").digest("hex");
}

async function main() {
  console.log("Seeding SCSIT Computer Labs and Staff Records...");

  // 1. Seed Labs A through I
  const labsData = [
    {
      name: "Lab A",
      code: "LBA",
      building: "EB",
      floor: "1",
      location: "Computer Center",
      seatingCapacity: 60,
      totalComputers: 60,
      operatingSystem: "Windows 11 / Ubuntu",
      primaryPurpose: "Central Computing & Practical Sessions",
    },
    {
      name: "Lab B",
      code: "LBB",
      building: "EA",
      floor: "1",
      location: "Basic Programming - I",
      seatingCapacity: 30,
      totalComputers: 30,
      operatingSystem: "Windows 11",
      primaryPurpose: "Programming Laboratory",
    },
    {
      name: "Lab C",
      code: "LBC",
      building: "EB",
      floor: "1",
      location: "Basic Programming - II",
      seatingCapacity: 30,
      totalComputers: 30,
      operatingSystem: "Windows 11 / Ubuntu",
      primaryPurpose: "Programming Laboratory",
    },
    {
      name: "Lab D",
      code: "LBD",
      building: "EA",
      floor: "5",
      location: "Room 505",
      seatingCapacity: 30,
      totalComputers: 30,
      operatingSystem: "Windows 11 / CentOS",
      primaryPurpose: "Cloud Computing & Virtualization",
    },
    {
      name: "Lab E",
      code: "LBE",
      building: "EA",
      floor: "5",
      location: "Room 504",
      seatingCapacity: 30,
      totalComputers: 30,
      operatingSystem: "Windows 11",
      primaryPurpose: "Web Development & Internet Technologies",
    },
    {
      name: "Lab F",
      code: "LBF",
      building: "EA",
      floor: "5",
      location: "Room 503",
      seatingCapacity: 30,
      totalComputers: 30,
      operatingSystem: "Windows 11 / Android SDK",
      primaryPurpose: "Mobile Application Development",
    },
    {
      name: "Lab G",
      code: "LBG",
      building: "EB",
      floor: "5",
      location: "Room 501",
      seatingCapacity: 30,
      totalComputers: 30,
      operatingSystem: "Windows 11 / MATLAB",
      primaryPurpose: "Mathematical Computing & Simulation",
    },
    {
      name: "Lab H",
      code: "LBH",
      building: "EB",
      floor: "5",
      location: "Room 502",
      seatingCapacity: 30,
      totalComputers: 30,
      operatingSystem: "Windows 11 / Ubuntu",
      primaryPurpose: "General Computer Practical Laboratory",
    },
    {
      name: "Lab I",
      code: "LBI",
      building: "EB",
      floor: "5",
      location: "Room 503",
      seatingCapacity: 20,
      totalComputers: 20,
      operatingSystem: "Raspbian / Windows 11",
      primaryPurpose: "Internet of Things (IoT) & Embedded Systems",
    },
  ];

  const createdLabs: Record<string, any> = {};
  for (const lab of labsData) {
    const dbLab = await prisma.lab.upsert({
      where: { code: lab.code },
      update: lab,
      create: lab,
    });
    createdLabs[lab.code] = dbLab;
  }
  console.log(`Seeded ${Object.keys(createdLabs).length} physical laboratories.`);

  // 2. Seed Primary In-Charge Personnel and Administrative Staff
  const staffData = [
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
      employeeId: "mrityunjay.sir",
      name: "Mrityunjay Sir",
      email: "mrityunjay@suas.ac.in",
      mobile: "9999999904",
      designation: "Trainer of Practice",
      passwordHash: hashValue("@dn1m@26"),
      pinHash: hashValue("2026"),
      assignedCodes: ["LBA"],
    },
    {
      employeeId: "prashant.sir",
      name: "Prashant Sir",
      email: "prashant@suas.ac.in",
      mobile: "9999999905",
      designation: "Trainer of Practice",
      passwordHash: hashValue("@dn1m@26"),
      pinHash: hashValue("2026"),
      assignedCodes: ["LBB", "LBC"],
    },
    {
      employeeId: "nitin.sir",
      name: "Nitin Sir",
      email: "nitin@suas.ac.in",
      mobile: "9999999903",
      designation: "Trainer of Practice",
      passwordHash: hashValue("@dn1m@26"),
      pinHash: hashValue("2026"),
      assignedCodes: ["LBD", "LBE"],
    },
    {
      employeeId: "karan.sir",
      name: "Karan Sir",
      email: "karan@suas.ac.in",
      mobile: "9999999906",
      designation: "Trainer of Practice",
      passwordHash: hashValue("@dn1m@26"),
      pinHash: hashValue("2026"),
      assignedCodes: ["LBF", "LBG"],
    },
    {
      employeeId: "salman.sir",
      name: "Salman Sir",
      email: "salman@suas.ac.in",
      mobile: "9999999907",
      designation: "Lab Assistant",
      passwordHash: hashValue("@dn1m@26"),
      pinHash: hashValue("2026"),
      assignedCodes: ["LBH", "LBI"],
    },
    {
      employeeId: "monark.raikwar",
      name: "Monark Sir",
      email: "monark.raikwar@suas.ac.in",
      mobile: "9999999902",
      designation: "Lab Assistant",
      passwordHash: hashValue("@dn1m@26"),
      pinHash: hashValue("2026"),
      assignedCodes: ["LBA", "LBB", "LBC", "LBD", "LBE", "LBF", "LBG", "LBH", "LBI"],
    },
  ];

  for (const staff of staffData) {
    const { assignedCodes, ...userData } = staff;
    const dbUser = await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData,
    });

    // Clear old lab staff assignments for this user
    await prisma.labStaff.deleteMany({ where: { userId: dbUser.id } });

    // Link current assignments
    if (assignedCodes && assignedCodes.length > 0) {
      for (const code of assignedCodes) {
        const lab = createdLabs[code];
        if (lab) {
          await prisma.labStaff.create({
            data: {
              userId: dbUser.id,
              labId: lab.id,
            },
          });
        }
      }
    }
  }
  console.log("Seeded default staff records and assigned laboratory relationships.");

  // 3. Seed default system settings
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
    { key: "module_laboratory_inventory", value: "true" },
    { key: "module_asset_management", value: "true" },
    { key: "module_notifications", value: "true" },
    { key: "module_naac_documentation", value: "true" },
    { key: "module_ieee_compliance", value: "true" },
    { key: "module_document_repository", value: "true" },
    { key: "module_search_audit_logs", value: "true" },
  ];

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log("Seeded settings configuration.");

  console.log("Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
