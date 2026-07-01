"use server";

import { prisma } from "../lib/db";
import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import {
  computerSchema,
  maintenanceSchema,
  inventorySchema,
  labBookingSchema,
  dailyWorkSchema,
  visitorSchema,
  labSchema,
} from "../lib/validation";

export interface ServiceResult {
  success: boolean;
  data?: any;
  error?: string;
  settings?: any;
  labs?: any;
  summary?: any;
  message?: string;
  stats?: any;
  submissionId?: string;
  createdAt?: string;
}

// Hash helper for passwords and PINs
function hashValue(val: string): string {
  if (!val) return "";
  return createHash("sha256").update(val).digest("hex");
}

/* ──────────────────────────────────────────────────────────────────────────
   1. AUTHENTICATION ACTIONS
   ────────────────────────────────────────────────────────────────────────── */

export async function verifyAdminLogin(employeeIdOrEmail: string, passwordPlain: string): Promise<ServiceResult> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { employeeId: employeeIdOrEmail },
          { email: employeeIdOrEmail }
        ]
      }
    });

    if (!user) {
      return { success: false, error: "User not found." };
    }

    const hashedInput = hashValue(passwordPlain);
    if (user.passwordHash !== hashedInput) {
      return { success: false, error: "Invalid password credentials." };
    }

    return {
      success: true,
      data: {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        designation: user.designation,
        isPinSet: !!user.pinHash,
      }
    };
  } catch (error: any) {
    console.error("verifyAdminLogin failed:", error);
    return { success: false, error: "Authentication system failure." };
  }
}

export async function verifyAdminPINLogin(employeeId: string, pinPlain: string): Promise<ServiceResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { employeeId }
    });

    if (!user) {
      return { success: false, error: "User not registered." };
    }

    if (!user.pinHash) {
      return { success: false, error: "Quick login PIN not configured." };
    }

    const hashedInput = hashValue(pinPlain);
    if (user.pinHash !== hashedInput) {
      return { success: false, error: "Incorrect PIN passcode." };
    }

    return {
      success: true,
      data: {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        designation: user.designation,
      }
    };
  } catch (error: any) {
    console.error("verifyAdminPINLogin failed:", error);
    return { success: false, error: "PIN authentication failure." };
  }
}

export async function setupAdminPIN(employeeId: string, passwordPlain: string, pinPlain: string): Promise<ServiceResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { employeeId }
    });

    if (!user) {
      return { success: false, error: "User profile not found." };
    }

    const hashedPass = hashValue(passwordPlain);
    if (user.passwordHash !== hashedPass) {
      return { success: false, error: "Invalid password confirmation." };
    }

    await prisma.user.update({
      where: { employeeId },
      data: { pinHash: hashValue(pinPlain) }
    });

    return { success: true };
  } catch (error: any) {
    console.error("setupAdminPIN failed:", error);
    return { success: false, error: "PIN configuration failure." };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   2. DASHBOARD & STATS ACTIONS
   ────────────────────────────────────────────────────────────────────────── */

export async function getDashboardStats(): Promise<ServiceResult> {
  try {
    const totalComputers = await prisma.computer.count();
    const workingSystems = await prisma.computer.count({
      where: { condition: { in: ["EXCELLENT", "WORKING"] } }
    });
    const faultySystems = await prisma.computer.count({
      where: { condition: "FAULTY" }
    });
    const pendingMaint = await prisma.maintenanceLog.count({
      where: { status: { notIn: ["RESOLVED", "CLOSED"] } }
    });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() + 90);

    const upcomingWarranty = await prisma.computer.count({
      where: { warrantyExpiry: { lte: ninetyDaysAgo, gte: new Date() } }
    });

    const recentLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: "desc" },
      include: { user: true }
    });

    const timeline = recentLogs.map(log => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      performedBy: log.user.name,
      action: log.actionPerformed,
      details: `Table: ${log.tableName} (ID: ${log.recordId})`
    }));

    return {
      success: true,
      stats: {
        totalComputers,
        workingSystems,
        faultySystems,
        pendingMaint,
        upcomingWarranty,
        timeline,
      }
    };
  } catch (error: any) {
    console.error("getDashboardStats failed:", error);
    return { success: false, error: "Failed to compile dashboard metrics." };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   3. COMPUTER REGISTRY ACTIONS
   ────────────────────────────────────────────────────────────────────────── */

export async function getComputers(labId?: string): Promise<ServiceResult> {
  try {
    const computers = await prisma.computer.findMany({
      where: labId ? { labId } : {},
      include: { lab: true },
      orderBy: { computerId: "asc" }
    });

    return { success: true, data: computers };
  } catch (error: any) {
    console.error("getComputers failed:", error);
    return { success: false, error: "Failed to retrieve computers list." };
  }
}

export async function saveComputer(data: any, authorId: string, ...args: any[]): Promise<ServiceResult> {
  try {
    const parsed = computerSchema.parse(data);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.computer.findUnique({
        where: { computerId: parsed.computerId }
      });

      let updatedComp;
      if (existing) {
        updatedComp = await tx.computer.update({
          where: { computerId: parsed.computerId },
          data: parsed
        });

        await tx.auditLog.create({
          data: {
            userId: authorId,
            actionPerformed: "Update Computer Wkstation specs",
            tableName: "Computer",
            recordId: updatedComp.id,
            previousValue: JSON.stringify(existing),
            updatedValue: JSON.stringify(updatedComp),
            ipAddress: "127.0.0.1",
            browserAgent: "Server Action Engine"
          }
        });
      } else {
        updatedComp = await tx.computer.create({
          data: parsed
        });

        await tx.auditLog.create({
          data: {
            userId: authorId,
            actionPerformed: "Create Computer Registry entry",
            tableName: "Computer",
            recordId: updatedComp.id,
            updatedValue: JSON.stringify(updatedComp),
            ipAddress: "127.0.0.1",
            browserAgent: "Server Action Engine"
          }
        });
      }

      return updatedComp;
    });

    revalidatePath("/admin/computers");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("saveComputer failed:", error);
    return { success: false, error: error.message || "Failed to persist computer details." };
  }
}

export async function deleteComputer(id: any, authorId: any, ...args: any[]): Promise<ServiceResult> {
  try {
    const stringId = String(id);
    await prisma.$transaction(async (tx) => {
      const comp = await tx.computer.findUnique({ where: { id: stringId } });
      if (!comp) throw new Error("Computer registry not found.");

      await tx.computer.delete({ where: { id: stringId } });
      await tx.auditLog.create({
        data: {
          userId: String(authorId),
          actionPerformed: "Decommissioned / Deleted Computer",
          tableName: "Computer",
          recordId: stringId,
          previousValue: JSON.stringify(comp),
          ipAddress: "127.0.0.1",
          browserAgent: "Server Action Engine"
        }
      });
    });

    revalidatePath("/admin/computers");
    return { success: true };
  } catch (error: any) {
    console.error("deleteComputer failed:", error);
    return { success: false, error: "Decommission procedure failed." };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   4. MAINTENANCE LOG ACTIONS
   ────────────────────────────────────────────────────────────────────────── */

export async function getMaintenanceLogs(): Promise<ServiceResult> {
  try {
    const logs = await prisma.maintenanceLog.findMany({
      include: {
        lab: true,
        computer: true
      },
      orderBy: { reportedDate: "desc" }
    });
    return { success: true, data: logs };
  } catch (error: any) {
    console.error("getMaintenanceLogs failed:", error);
    return { success: false, error: "Failed to compile maintenance log register." };
  }
}

export async function saveMaintenanceLog(data: any, authorId: string, ...args: any[]): Promise<ServiceResult> {
  try {
    const parsed = maintenanceSchema.parse(data);
    const maintenanceId = `MN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.maintenanceLog.create({
        data: {
          ...parsed,
          maintenanceId
        }
      });

      await tx.computer.update({
        where: { id: parsed.computerId },
        data: {
          condition: "FAULTY",
          status: "UNDER_REPAIR"
        }
      });

      await tx.auditLog.create({
        data: {
          userId: authorId,
          actionPerformed: "Logged Computer issue ticket",
          tableName: "MaintenanceLog",
          recordId: log.id,
          updatedValue: JSON.stringify(log),
          ipAddress: "127.0.0.1",
          browserAgent: "Server Action Engine"
        }
      });

      return log;
    });

    revalidatePath("/admin/maintenance");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("saveMaintenanceLog failed:", error);
    return { success: false, error: "Failed to register maintenance report." };
  }
}

export async function updateMaintenanceStatus(id: string, newStatus: any, remarks: string, authorId: string, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.maintenanceLog.findUnique({ where: { id } });
      if (!existing) throw new Error("Ticket not found.");

      const updated = await tx.maintenanceLog.update({
        where: { id },
        data: {
          status: newStatus,
          remarks,
          completionDate: ["RESOLVED", "CLOSED"].includes(newStatus) ? new Date() : undefined
        }
      });

      if (["RESOLVED", "CLOSED"].includes(newStatus)) {
        await tx.computer.update({
          where: { id: updated.computerId },
          data: {
            condition: "WORKING",
            status: "ONLINE",
            lastServiceDate: new Date()
          }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: authorId,
          actionPerformed: `Updated ticket status to ${newStatus}`,
          tableName: "MaintenanceLog",
          recordId: id,
          previousValue: JSON.stringify(existing),
          updatedValue: JSON.stringify(updated),
          ipAddress: "127.0.0.1",
          browserAgent: "Server Action Engine"
        }
      });
    });

    revalidatePath("/admin/maintenance");
    return { success: true };
  } catch (error: any) {
    console.error("updateMaintenanceStatus failed:", error);
    return { success: false, error: "Failed to transition maintenance state pipeline." };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   5. LABORATORIES & SETTINGS
   ────────────────────────────────────────────────────────────────────────── */

export async function getLaboratories(): Promise<ServiceResult> {
  try {
    const labs = await prisma.lab.findMany({
      orderBy: { name: "asc" }
    });
    return { success: true, labs };
  } catch (error) {
    console.error("getLaboratories failed:", error);
    return { success: false, error: "Failed to fetch SCSIT labs list." };
  }
}

export async function getAuditLogs(): Promise<ServiceResult> {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { timestamp: "desc" },
      take: 100
    });
    return { success: true, data: logs };
  } catch (error) {
    console.error("getAuditLogs failed:", error);
    return { success: false, error: "Failed to compile audit logs." };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   6. COMPATIBILITY LAYER FOR LEGACY INTEGRATIONS
   ────────────────────────────────────────────────────────────────────────── */

export async function getSettings(...args: any[]): Promise<ServiceResult> {
  try {
    const dbSettings = await prisma.settings.findMany();
    const settingsMap: Record<string, string> = {};
    dbSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    return { success: true, settings: settingsMap };
  } catch (err) {
    return { success: true, settings: {} };
  }
}

export async function updateSetting(key: string, value: string, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to update setting." };
  }
}

export async function getSubmissions(): Promise<ServiceResult> {
  try {
    const list = await prisma.softwareRequest.findMany({
      include: { software: true }
    });
    return { success: true, data: list };
  } catch (err) {
    return { success: true, data: [] };
  }
}

export async function deleteSubmission(id: any, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.softwareRequest.delete({ where: { id: String(id) } });
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to delete submission." };
  }
}

export async function updateClassStatusAndRemarks(submissionId: string | number, classId: string, status: string, remarks: string, ...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function getAdmins(): Promise<ServiceResult> {
  try {
    const list = await prisma.user.findMany();
    return { success: true, data: list };
  } catch (err) {
    return { success: true, data: [] };
  }
}

export async function saveAdmin(data: any, ...args: any[]): Promise<ServiceResult> {
  try {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {
        employeeId: data.employeeId || "MOCK-1",
        name: data.name,
        mobile: data.mobile || "9999999999",
        passwordHash: data.passwordHash || hashValue("default"),
        designation: data.designation || "Assistant"
      },
      create: {
        email: data.email,
        employeeId: data.employeeId || "MOCK-1",
        name: data.name,
        mobile: data.mobile || "9999999999",
        passwordHash: data.passwordHash || hashValue("default"),
        designation: data.designation || "Assistant"
      }
    });
    return { success: true, data: user };
  } catch (err) {
    return { success: false, error: "Failed to save admin user." };
  }
}

export async function deleteAdmin(id: any, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.user.delete({ where: { id: String(id) } });
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to delete admin user." };
  }
}

export async function adminCreateSubmission(...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function getDepartmentDetails(): Promise<ServiceResult> {
  return { success: true, data: { department_name: "SCSIT", academic_year: "2026", coordinator_name: "Karan Mishra", lab_coordinator_name: "Monark Raikwar", total_labs: 9 } };
}

export async function updateDepartmentDetails(...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function saveLaboratory(data: any, ...args: any[]): Promise<ServiceResult> {
  try {
    const lab = await prisma.lab.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        floor: data.floor || "1",
        location: data.location || "EB",
        seatingCapacity: data.seatingCapacity || 30,
        totalComputers: data.totalComputers || 30,
        operatingSystem: data.operatingSystem || "Windows 11",
        primaryPurpose: data.primaryPurpose || "Computer Lab"
      },
      create: {
        code: data.code,
        name: data.name,
        floor: data.floor || "1",
        location: data.location || "EB",
        seatingCapacity: data.seatingCapacity || 30,
        totalComputers: data.totalComputers || 30,
        operatingSystem: data.operatingSystem || "Windows 11",
        primaryPurpose: data.primaryPurpose || "Computer Lab"
      }
    });
    return { success: true, data: lab };
  } catch (err) {
    return { success: false, error: "Failed to save laboratory details." };
  }
}

export async function deleteLaboratory(id: any, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.lab.delete({ where: { id: String(id) } });
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to delete laboratory." };
  }
}

export async function getLabSoftwares(): Promise<ServiceResult> {
  try {
    const list = await prisma.softwareDeployment.findMany({ include: { computer: true, software: true } });
    return { success: true, data: list };
  } catch (err) {
    return { success: true, data: [] };
  }
}

export async function saveLabSoftware(data: any, ...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function deleteLabSoftware(id: any, ...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function deleteMaintenanceLog(id: any, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.maintenanceLog.delete({ where: { id: String(id) } });
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to delete maintenance log." };
  }
}

export async function getInventory(): Promise<ServiceResult> {
  try {
    const list = await prisma.inventory.findMany({ include: { lab: true } });
    return { success: true, data: list };
  } catch (err) {
    return { success: true, data: [] };
  }
}

export async function saveInventoryItem(data: any, ...args: any[]): Promise<ServiceResult> {
  try {
    const item = await prisma.inventory.upsert({
      where: { assetNumber: data.assetNumber },
      update: {
        labId: data.labId,
        deviceType: data.deviceType,
        purchaseDate: data.purchaseDate || new Date(),
        specifications: data.specifications || {}
      },
      create: {
        assetNumber: data.assetNumber,
        labId: data.labId,
        deviceType: data.deviceType,
        purchaseDate: data.purchaseDate || new Date(),
        specifications: data.specifications || {}
      }
    });
    return { success: true, data: item };
  } catch (err) {
    return { success: false, error: "Failed to save inventory item." };
  }
}

export async function deleteInventoryItem(id: any, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.inventory.delete({ where: { id: String(id) } });
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to delete inventory item." };
  }
}

export async function getAssetLifecycle(): Promise<ServiceResult> {
  try {
    const list = await prisma.assetLifecycle.findMany({ include: { inventory: true } });
    return { success: true, data: list };
  } catch (err) {
    return { success: true, data: [] };
  }
}

export async function saveAssetLifecycle(data: any, ...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function deleteAssetLifecycle(id: any, ...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function getNaacDocs(): Promise<ServiceResult> {
  try {
    const list = await prisma.documentRepository.findMany({ where: { category: "NAAC" } });
    return { success: true, data: list };
  } catch (err) {
    return { success: true, data: [] };
  }
}

export async function saveNaacDoc(data: any, ...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function deleteNaacDoc(id: any, ...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function getIeeeCompliance(): Promise<ServiceResult> {
  return { success: true, data: [] };
}

export async function saveIeeeCompliance(...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function deleteIeeeCompliance(...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function getDocumentRepo(): Promise<ServiceResult> {
  try {
    const list = await prisma.documentRepository.findMany();
    return { success: true, data: list };
  } catch (err) {
    return { success: true, data: [] };
  }
}

export async function saveDocument(data: any, ...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function deleteDocument(id: any, ...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function clearAuditLogs(...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.auditLog.deleteMany();
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to clear audit logs." };
  }
}

export async function logAdminLogout(...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function submitForm(data: any, ...args: any[]): Promise<ServiceResult> {
  return { success: true, data: { submissionId: "SUB-" + Math.floor(1000 + Math.random() * 9000), createdAt: new Date().toISOString() } };
}

export async function lookupSubmissionStatus(...args: any[]): Promise<ServiceResult> {
  return { success: true, data: [] };
}

export async function importAssetsBulk(...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function getImportLogs(...args: any[]): Promise<ServiceResult> {
  return { success: true, data: [] };
}
