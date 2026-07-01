import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import dotenv from "dotenv";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const EXCEL_PATH = path.join(process.cwd(), "labs_import_template.xlsx");

/**
 * Generate a realistic Excel file containing Lab and Computer registers data programmatically.
 */
function createMockExcelFile() {
  console.log(`Generating mock Excel file at: ${EXCEL_PATH}`);

  const labsData = [
    {
      "Lab Name": "Lab J",
      "Lab Code": "LBJ",
      "Building": "EB",
      "Floor": "2",
      "Location": "Room 201",
      "Capacity": 40,
      "OS": "Windows 11",
      "Purpose": "Advanced Machine Learning Lab"
    },
    {
      "Lab Name": "Lab K",
      "Lab Code": "LBK",
      "Building": "EB",
      "Floor": "2",
      "Location": "Room 202",
      "Capacity": 40,
      "OS": "Windows 11 / Ubuntu",
      "Purpose": "Database Administration Lab"
    }
  ];

  const computersData = [
    {
      "Computer ID": "LBJ-001",
      "Hostname": "SCSIT-LBJ-001",
      "Lab Code": "LBJ",
      "Bench Number": "Row 1 Col 1",
      "IP Address": "192.168.10.10",
      "MAC Address": "A0:B1:C2:D3:E4:F5",
      "CPU": "Intel Core i7-12700",
      "Motherboard": "Dell 0H9T80",
      "RAM GB": 16,
      "SSD GB": 512,
      "HDD GB": 1000,
      "GPU": "Nvidia GTX 1660 Super",
      "Monitor": "Dell 24 inch",
      "Keyboard": "Dell",
      "Mouse": "Dell",
      "UPS": "APC 600VA",
      "Purchase Date": "2024-01-15",
      "Warranty Expiry": "2027-01-15",
      "Operating System": "Windows 11 Pro",
      "Vendor": "Dell India Store",
      "Condition": "EXCELLENT",
      "Status": "ONLINE"
    },
    {
      "Computer ID": "LBJ-002",
      "Hostname": "SCSIT-LBJ-002",
      "Lab Code": "LBJ",
      "Bench Number": "Row 1 Col 2",
      "IP Address": "192.168.10.11",
      "MAC Address": "A0:B1:C2:D3:E4:F6",
      "CPU": "Intel Core i7-12700",
      "Motherboard": "Dell 0H9T80",
      "RAM GB": 16,
      "SSD GB": 512,
      "HDD GB": 1000,
      "GPU": "Nvidia GTX 1660 Super",
      "Monitor": "Dell 24 inch",
      "Keyboard": "Dell",
      "Mouse": "Dell",
      "UPS": "APC 600VA",
      "Purchase Date": "2024-01-15",
      "Warranty Expiry": "2027-01-15",
      "Operating System": "Windows 11 Pro",
      "Vendor": "Dell India Store",
      "Condition": "EXCELLENT",
      "Status": "ONLINE"
    },
    {
      "Computer ID": "LBK-001",
      "Hostname": "SCSIT-LBK-001",
      "Lab Code": "LBK",
      "Bench Number": "Row 1 Col 1",
      "IP Address": "192.168.11.10",
      "MAC Address": "B0:C1:D2:E3:F4:A5",
      "CPU": "Intel Core i9-13900",
      "Motherboard": "ASUS PRIME Z790",
      "RAM GB": 32,
      "SSD GB": 1024,
      "HDD GB": 2000,
      "GPU": "Nvidia RTX 3060",
      "Monitor": "HP 27 inch",
      "Keyboard": "HP",
      "Mouse": "HP",
      "UPS": "APC 1KVA",
      "Purchase Date": "2024-03-10",
      "Warranty Expiry": "2027-03-10",
      "Operating System": "Windows 11 / Ubuntu 24.04",
      "Vendor": "HP India Retail",
      "Condition": "WORKING",
      "Status": "ONLINE"
    }
  ];

  const maintenanceData = [
    {
      "Maintenance ID": "MN-2026-9001",
      "Lab Code": "LBJ",
      "Computer ID": "LBJ-001",
      "PC Number": "LBJ-001",
      "System Make": "Dell",
      "System Model": "OptiPlex 7090",
      "Serial Number": "DELL-1002345",
      "Issue": "System showing Blue Screen of Death (BSOD) intermittently",
      "Technician": "Vikas Sharma",
      "Status": "REPORTED",
      "Remarks": "Reported by Lab Assistant Salman"
    }
  ];

  const wb = XLSX.utils.book_new();

  const wsLabs = XLSX.utils.json_to_sheet(labsData);
  XLSX.utils.book_append_sheet(wb, wsLabs, "Labs");

  const wsComputers = XLSX.utils.json_to_sheet(computersData);
  XLSX.utils.book_append_sheet(wb, wsComputers, "Computers");

  const wsMaintenance = XLSX.utils.json_to_sheet(maintenanceData);
  XLSX.utils.book_append_sheet(wb, wsMaintenance, "Maintenance");

  XLSX.writeFile(wb, EXCEL_PATH);
  console.log("Excel file successfully created!");
}

async function importExcelData() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel file does not exist at path: ${EXCEL_PATH}`);
  }

  console.log("Reading and parsing Excel file...");
  const wb = XLSX.readFile(EXCEL_PATH);

  // 1. Import Labs Sheet
  console.log("Processing [Labs] Sheet...");
  const labsSheet = wb.Sheets["Labs"];
  if (!labsSheet) throw new Error("Labs sheet not found in Excel file.");
  const labsRows: any[] = XLSX.utils.sheet_to_json(labsSheet);
  
  const labIdMap: Record<string, string> = {}; // Code -> UUID mapping

  for (const row of labsRows) {
    const code = String(row["Lab Code"]);
    console.log(`Upserting Lab: ${row["Lab Name"]} (${code})`);
    
    const dbLab = await prisma.lab.upsert({
      where: { code },
      update: {
        name: row["Lab Name"],
        building: row["Building"],
        floor: String(row["Floor"]),
        location: row["Location"],
        seatingCapacity: Number(row["Capacity"] || 30),
        totalComputers: Number(row["Capacity"] || 0),
        operatingSystem: row["OS"],
        primaryPurpose: row["Purpose"]
      },
      create: {
        name: row["Lab Name"],
        code: code,
        building: row["Building"],
        floor: String(row["Floor"]),
        location: row["Location"],
        seatingCapacity: Number(row["Capacity"] || 30),
        totalComputers: Number(row["Capacity"] || 0),
        operatingSystem: row["OS"],
        primaryPurpose: row["Purpose"]
      }
    });
    labIdMap[code] = dbLab.id;
  }

  // 2. Import Computers Sheet
  console.log("Processing [Computers] Sheet...");
  const computersSheet = wb.Sheets["Computers"];
  if (!computersSheet) throw new Error("Computers sheet not found in Excel file.");
  const computersRows: any[] = XLSX.utils.sheet_to_json(computersSheet);

  const computerIdMap: Record<string, string> = {}; // ID -> UUID mapping

  for (const row of computersRows) {
    const computerId = String(row["Computer ID"]);
    const labCode = String(row["Lab Code"]);
    const labId = labIdMap[labCode];
    if (!labId) {
      console.warn(`Warning: Lab Code ${labCode} not found for computer ${computerId}. Skipping.`);
      continue;
    }

    console.log(`Upserting Computer: ${computerId}`);

    const dbComp = await prisma.computer.upsert({
      where: { computerId },
      update: {
        hostname: row["Hostname"],
        labId: labId,
        benchNumber: String(row["Bench Number"]),
        ipAddress: row["IP Address"],
        macAddress: row["MAC Address"],
        cpu: row["CPU"],
        motherboard: row["Motherboard"],
        ramGb: Number(row["RAM GB"] || 8),
        ssdGb: Number(row["SSD GB"] || 256),
        hddGb: Number(row["HDD GB"] || 0),
        gpu: row["GPU"],
        monitorDetails: row["Monitor"] || "",
        keyboardBrand: row["Keyboard"] || "",
        mouseBrand: row["Mouse"] || "",
        upsDetails: row["UPS"],
        purchaseDate: new Date(row["Purchase Date"]),
        warrantyExpiry: new Date(row["Warranty Expiry"]),
        operatingSystem: row["Operating System"],
        vendorDetails: row["Vendor"] || "",
        condition: row["Condition"] || "EXCELLENT",
        status: row["Status"] || "ONLINE"
      },
      create: {
        computerId: computerId,
        hostname: row["Hostname"],
        labId: labId,
        benchNumber: String(row["Bench Number"]),
        ipAddress: row["IP Address"],
        macAddress: row["MAC Address"],
        cpu: row["CPU"],
        motherboard: row["Motherboard"],
        ramGb: Number(row["RAM GB"] || 8),
        ssdGb: Number(row["SSD GB"] || 256),
        hddGb: Number(row["HDD GB"] || 0),
        gpu: row["GPU"],
        monitorDetails: row["Monitor"] || "",
        keyboardBrand: row["Keyboard"] || "",
        mouseBrand: row["Mouse"] || "",
        upsDetails: row["UPS"],
        purchaseDate: new Date(row["Purchase Date"]),
        warrantyExpiry: new Date(row["Warranty Expiry"]),
        operatingSystem: row["Operating System"],
        vendorDetails: row["Vendor"] || "",
        condition: row["Condition"] || "EXCELLENT",
        status: row["Status"] || "ONLINE"
      }
    });

    computerIdMap[computerId] = dbComp.id;
  }

  // 3. Import Maintenance logs Sheet
  console.log("Processing [Maintenance] Sheet...");
  const maintSheet = wb.Sheets["Maintenance"];
  if (!maintSheet) throw new Error("Maintenance sheet not found in Excel file.");
  const maintRows: any[] = XLSX.utils.sheet_to_json(maintSheet);

  for (const row of maintRows) {
    const maintenanceId = String(row["Maintenance ID"]);
    const labCode = String(row["Lab Code"]);
    const computerId = String(row["Computer ID"]);

    const labUuid = labIdMap[labCode];
    const compUuid = computerIdMap[computerId];

    if (!labUuid || !compUuid) {
      console.warn(`Warning: Could not link maintenance ticket ${maintenanceId} (lab: ${labCode}, comp: ${computerId}). Skipping.`);
      continue;
    }

    console.log(`Upserting Maintenance Ticket: ${maintenanceId}`);

    await prisma.maintenanceLog.upsert({
      where: { maintenanceId },
      update: {
        labId: labUuid,
        computerId: compUuid,
        pcNumber: String(row["PC Number"]),
        systemMake: row["System Make"],
        systemModel: row["System Model"],
        serialNumber: row["Serial Number"],
        issueDescription: row["Issue"],
        technicianName: row["Technician"],
        status: row["Status"] || "REPORTED",
        remarks: row["Remarks"]
      },
      create: {
        maintenanceId: maintenanceId,
        labId: labUuid,
        computerId: compUuid,
        pcNumber: String(row["PC Number"]),
        systemMake: row["System Make"],
        systemModel: row["System Model"],
        serialNumber: row["Serial Number"],
        issueDescription: row["Issue"],
        technicianName: row["Technician"],
        status: row["Status"] || "REPORTED",
        remarks: row["Remarks"]
      }
    });
  }

  console.log("Excel import completed successfully!");
}

async function main() {
  try {
    createMockExcelFile();
    await importExcelData();
    console.log("=== Import script successfully ran! ===");
  } catch (err) {
    console.error("Critical error in run:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
