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

  // Seed Software Master Catalog
  const softwareCatalog = [
    { name: "Scilab", category: "Scientific Computing", latestVersion: "6.1.1", licenseDetails: "Open Source", compatibility: "Windows" },
    { name: "Java SE Development Kit", category: "Programming", latestVersion: "26.0.1", licenseDetails: "Oracle/OpenJDK", compatibility: "Windows" },
    { name: "Visual Studio Code", category: "IDE", latestVersion: "Latest", licenseDetails: "Open Source", compatibility: "Windows" },
    { name: "Apache Tomcat", category: "Web Server", latestVersion: "9", licenseDetails: "Open Source", compatibility: "Windows" },
    { name: "MySQL Server", category: "Database", latestVersion: "8.0.46", licenseDetails: "Community", compatibility: "Windows" },
    { name: "MySQL Connector", category: "Database Driver", latestVersion: "9.2", licenseDetails: "Community", compatibility: "Windows" },
    { name: "Eclipse IDE", category: "IDE", latestVersion: "Latest", licenseDetails: "Open Source", compatibility: "Windows" },
    { name: "Spring Initializr", category: "Framework", latestVersion: "Latest", licenseDetails: "Open Source", compatibility: "Web" },
    { name: "Spyder", category: "IDE", latestVersion: "Latest", licenseDetails: "Open Source", compatibility: "Windows" },
    { name: "Jupyter Notebook", category: "IDE", latestVersion: "Latest", licenseDetails: "Open Source", compatibility: "Windows" },
    { name: "PyCharm", category: "IDE", latestVersion: "Latest", licenseDetails: "Community", compatibility: "Windows" },
    { name: "XAMPP", category: "Web Stack", latestVersion: "Latest", licenseDetails: "Open Source", compatibility: "Windows" },
    { name: "Power BI Desktop", category: "Analytics", latestVersion: "Latest", licenseDetails: "Microsoft", compatibility: "Windows" },
    { name: "Microsoft Excel", category: "Productivity", latestVersion: "Microsoft 365", licenseDetails: "Licensed", compatibility: "Windows" },
    { name: "Python", category: "Programming", latestVersion: "Latest Stable", licenseDetails: "Open Source", compatibility: "Windows" },
    { name: "Dev C++", category: "IDE", latestVersion: "Latest", licenseDetails: "Open Source", compatibility: "Windows" },
    { name: "MongoDB Atlas", category: "Cloud Database", latestVersion: "Latest", licenseDetails: "Cloud", compatibility: "Web" },
  ];

  const createdSoftware: Record<string, any> = {};
  for (const sw of softwareCatalog) {
    const dbSw = await prisma.software.upsert({
      where: { name: sw.name },
      update: sw,
      create: sw,
    });
    createdSoftware[sw.name] = dbSw;
  }
  console.log(`Seeded ${Object.keys(createdSoftware).length} software master records.`);

  // Clear old requests
  await prisma.softwareRequest.deleteMany({});

  const requestsData = [
    // Dr. Devendra Chouhan
    { facultyName: "Dr. Devendra Chouhan", facultyEmail: "devendra@suas.ac.in", subjectName: "Applied Mathematics, Statistics", semester: "I, III", softwareName: "Scilab", installDetails: "Version 6.1.1, Labs A, B, C, D, E, F, G, H" },
    
    // Dr. Kush Bhushanwar
    { facultyName: "Dr. Kush Bhushanwar", facultyEmail: "kush@suas.ac.in", subjectName: "J2EE", semester: "III", softwareName: "Java SE Development Kit", installDetails: "Version 26.0.1, Lab B" },
    { facultyName: "Dr. Kush Bhushanwar", facultyEmail: "kush@suas.ac.in", subjectName: "J2EE", semester: "III", softwareName: "Visual Studio Code", installDetails: "Latest Compatible, Lab B" },
    { facultyName: "Dr. Kush Bhushanwar", facultyEmail: "kush@suas.ac.in", subjectName: "J2EE", semester: "III", softwareName: "Apache Tomcat", installDetails: "Version 9, Lab B" },
    { facultyName: "Dr. Kush Bhushanwar", facultyEmail: "kush@suas.ac.in", subjectName: "J2EE", semester: "III", softwareName: "MySQL Server", installDetails: "Version 8.0.46, Lab B" },
    { facultyName: "Dr. Kush Bhushanwar", facultyEmail: "kush@suas.ac.in", subjectName: "J2EE", semester: "III", softwareName: "MySQL Connector", installDetails: "Version 9.2, Lab B" },
    { facultyName: "Dr. Kush Bhushanwar", facultyEmail: "kush@suas.ac.in", subjectName: "J2EE", semester: "III", softwareName: "Eclipse IDE", installDetails: "Latest Compatible, Lab B" },
    { facultyName: "Dr. Kush Bhushanwar", facultyEmail: "kush@suas.ac.in", subjectName: "J2EE", semester: "III", softwareName: "Spring Initializr", installDetails: "Latest Compatible, Lab B" },

    // Dr. Praveen Goyal
    { facultyName: "Dr. Praveen Goyal", facultyEmail: "praveen@suas.ac.in", subjectName: "Web Technologies", semester: "I, III, V", softwareName: "Visual Studio Code", installDetails: "Latest Compatible, Labs A, B, C, D, E, F, G, H" },
    { facultyName: "Dr. Praveen Goyal", facultyEmail: "praveen@suas.ac.in", subjectName: "Python", semester: "I, III, V", softwareName: "Spyder", installDetails: "Latest Compatible, Labs A, B, C, D, E, F, G, H" },
    { facultyName: "Dr. Praveen Goyal", facultyEmail: "praveen@suas.ac.in", subjectName: "Python", semester: "I, III, V", softwareName: "Jupyter Notebook", installDetails: "Latest Compatible, Labs A, B, C, D, E, F, G, H" },
    { facultyName: "Dr. Praveen Goyal", facultyEmail: "praveen@suas.ac.in", subjectName: "Python", semester: "I, III, V", softwareName: "PyCharm", installDetails: "Latest Compatible, Labs A, B, C, D, E, F, G, H" },
    { facultyName: "Dr. Praveen Goyal", facultyEmail: "praveen@suas.ac.in", subjectName: "Web Technologies", semester: "I, III, V", softwareName: "XAMPP", installDetails: "Latest Compatible, Labs A, B, C, D, E, F, G, H" },
    { facultyName: "Dr. Praveen Goyal", facultyEmail: "praveen@suas.ac.in", subjectName: "FIS", semester: "I, III, V", softwareName: "Power BI Desktop", installDetails: "Latest Compatible, Labs A, B, C, D, E, F, G, H" },
    { facultyName: "Dr. Praveen Goyal", facultyEmail: "praveen@suas.ac.in", subjectName: "FIS", semester: "I, III, V", softwareName: "Microsoft Excel", installDetails: "Latest Compatible, Labs A, B, C, D, E, F, G, H" },
    { facultyName: "Dr. Praveen Goyal", facultyEmail: "praveen@suas.ac.in", subjectName: "Python", semester: "I, III, V", softwareName: "Python", installDetails: "Latest Stable, Labs A, B, C, D, E, F, G, H" },

    // Mr. Lokesh Sahu
    { facultyName: "Mr. Lokesh Sahu", facultyEmail: "lokesh@suas.ac.in", subjectName: "CPA / ADBMS", semester: "To be Assigned", softwareName: "Dev C++", installDetails: "Latest Compatible, Labs To be Assigned" },
    { facultyName: "Mr. Lokesh Sahu", facultyEmail: "lokesh@suas.ac.in", subjectName: "ADBMS", semester: "To be Assigned", softwareName: "MySQL Server", installDetails: "Latest Compatible, Labs To be Assigned" },
    { facultyName: "Mr. Lokesh Sahu", facultyEmail: "lokesh@suas.ac.in", subjectName: "ADBMS", semester: "To be Assigned", softwareName: "MongoDB Atlas", installDetails: "Latest Compatible, Labs To be Assigned" },

    // Dr. Maya Rathore
    { facultyName: "Dr. Maya Rathore", facultyEmail: "maya@suas.ac.in", subjectName: "OOP using Java", semester: "I, III", softwareName: "Visual Studio Code", installDetails: "Latest Compatible, Labs To be Assigned" },
    { facultyName: "Dr. Maya Rathore", facultyEmail: "maya@suas.ac.in", subjectName: "OOP using Java", semester: "I, III", softwareName: "MySQL Connector", installDetails: "Version 9.2, Labs To be Assigned" },
    { facultyName: "Dr. Maya Rathore", facultyEmail: "maya@suas.ac.in", subjectName: "OOP using Java", semester: "I, III", softwareName: "Java SE Development Kit", installDetails: "Version 26.0.1, Labs To be Assigned" }
  ];

  for (const req of requestsData) {
    const sw = createdSoftware[req.softwareName];
    if (sw) {
      await prisma.softwareRequest.create({
        data: {
          facultyName: req.facultyName,
          facultyEmail: req.facultyEmail,
          subjectName: req.subjectName,
          semester: req.semester,
          softwareId: sw.id,
          installDetails: req.installDetails,
          status: "Pending",
        }
      });
    }
  }
  console.log("Seeded faculty software requirements logs.");

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
