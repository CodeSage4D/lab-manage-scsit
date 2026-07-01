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

function hashValue(val: string): string {
  if (!val) return "";
  return createHash("sha256").update(val + "scsit_suas_secure_salt_2026").digest("hex");
}

/* ══════════════════════════════════════════════════════════════════════════════
   1. AUTHENTICATION
══════════════════════════════════════════════════════════════════════════════ */

export async function verifyAdminLogin(employeeIdOrEmail: string, passwordPlain: string): Promise<ServiceResult> {
  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ employeeId: employeeIdOrEmail }, { email: employeeIdOrEmail }] },
    });
    if (!user) return { success: false, error: "User not found." };
    if (user.passwordHash !== hashValue(passwordPlain)) return { success: false, error: "Invalid password." };
    return {
      success: true,
      data: { id: user.id, employeeId: user.employeeId, name: user.name, email: user.email, mobile: user.mobile, designation: user.designation },
    };
  } catch (e: any) {
    return { success: false, error: "Authentication failure." };
  }
}

export async function verifyAdminPINLogin(employeeId: string, pinPlain: string): Promise<ServiceResult> {
  try {
    const user = await prisma.user.findUnique({ where: { employeeId } });
    if (!user || !user.pinHash) return { success: false, error: "User or PIN not found." };
    if (user.pinHash !== hashValue(pinPlain)) return { success: false, error: "Invalid PIN." };
    return { success: true, data: { id: user.id, employeeId: user.employeeId, name: user.name, email: user.email, mobile: user.mobile, designation: user.designation } };
  } catch (e: any) {
    return { success: false, error: "PIN authentication failure." };
  }
}

export async function setupAdminPIN(employeeId: string, passwordPlain: string, pinPlain: string): Promise<ServiceResult> {
  try {
    const user = await prisma.user.findUnique({ where: { employeeId } });
    if (!user) return { success: false, error: "User not found." };
    if (user.passwordHash !== hashValue(passwordPlain)) return { success: false, error: "Invalid password confirmation." };
    await prisma.user.update({ where: { employeeId }, data: { pinHash: hashValue(pinPlain) } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "PIN setup failed." };
  }
}

export async function logAdminLogout(...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

/* ══════════════════════════════════════════════════════════════════════════════
   2. DASHBOARD STATS
══════════════════════════════════════════════════════════════════════════════ */

export async function getDashboardStats(): Promise<ServiceResult> {
  try {
    const [
      totalComputers, onlineComputers, faultyComputers, underRepair, decommissioned,
      totalLabs, activeLabs,
      openMaintenance, totalMaintenance, resolvedMaintenance,
      totalInventory, totalBookings, todayBookings,
      totalVisitors, todayVisitors,
      totalDailyLogs, totalDocuments, totalSoftware, totalUsers,
      warrantyExpired, warrantyExpiringSoon,
    ] = await Promise.all([
      prisma.computer.count(),
      prisma.computer.count({ where: { status: "ONLINE" } }),
      prisma.computer.count({ where: { condition: "FAULTY" } }),
      prisma.computer.count({ where: { status: "UNDER_REPAIR" } }),
      prisma.computer.count({ where: { status: "DECOMMISSIONED" } }),
      prisma.lab.count(),
      prisma.lab.count({ where: { status: "ACTIVE" } }),
      prisma.maintenanceLog.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }),
      prisma.maintenanceLog.count(),
      prisma.maintenanceLog.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
      prisma.inventory.count(),
      prisma.labBooking.count(),
      prisma.labBooking.count({ where: { bookingDate: { gte: new Date(new Date().setHours(0,0,0,0)), lt: new Date(new Date().setHours(23,59,59,999)) } } }),
      prisma.visitorRegister.count(),
      prisma.visitorRegister.count({ where: { entryTime: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      prisma.dailyWorkRegister.count(),
      prisma.documentRepository.count(),
      prisma.software.count(),
      prisma.user.count(),
      prisma.computer.count({ where: { warrantyExpiry: { lt: new Date() } } }),
      prisma.computer.count({ where: { warrantyExpiry: { lt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), gte: new Date() } } }),
    ]);

    const recentActivity = await prisma.auditLog.findMany({
      take: 15,
      orderBy: { timestamp: "desc" },
      include: { user: true },
    });

    const recentMaintenance = await prisma.maintenanceLog.findMany({
      take: 5,
      orderBy: { reportedDate: "desc" },
      include: { lab: true, computer: true },
      where: { status: { notIn: ["CLOSED"] } },
    });

    const todayBookingsList = await prisma.labBooking.findMany({
      where: { bookingDate: { gte: new Date(new Date().setHours(0,0,0,0)), lt: new Date(new Date().setHours(23,59,59,999)) } },
      include: { lab: true },
      orderBy: { timeSlot: "asc" },
    });

    return {
      success: true,
      stats: {
        computers: { total: totalComputers, online: onlineComputers, faulty: faultyComputers, underRepair, decommissioned, warrantyExpired, warrantyExpiringSoon },
        labs: { total: totalLabs, active: activeLabs, maintenance: totalLabs - activeLabs },
        maintenance: { open: openMaintenance, total: totalMaintenance, resolved: resolvedMaintenance },
        inventory: { total: totalInventory },
        bookings: { total: totalBookings, today: todayBookings },
        visitors: { total: totalVisitors, today: todayVisitors },
        records: { dailyLogs: totalDailyLogs, documents: totalDocuments, software: totalSoftware },
        users: { total: totalUsers },
        recentActivity: recentActivity.map(l => ({
          id: l.id, timestamp: l.timestamp.toISOString(),
          performedBy: l.user.name, action: l.actionPerformed,
          table: l.tableName, recordId: l.recordId,
        })),
        recentMaintenance: recentMaintenance.map(m => ({
          id: m.id, maintenanceId: m.maintenanceId, labName: m.lab?.name,
          computerId: m.computer?.computerId, issue: m.issueDescription,
          status: m.status, reportedDate: m.reportedDate.toISOString(),
        })),
        todayBookings: todayBookingsList.map(b => ({
          id: b.id, labName: b.lab?.name, timeSlot: b.timeSlot,
          faculty: b.facultyName, subject: b.subjectName, students: b.studentCount,
        })),
      },
    };
  } catch (e: any) {
    console.error("getDashboardStats failed:", e);
    return { success: false, error: "Failed to compile dashboard." };
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   3. COMPUTER REGISTRY
══════════════════════════════════════════════════════════════════════════════ */

export async function getComputers(labId?: string): Promise<ServiceResult> {
  try {
    const computers = await prisma.computer.findMany({
      where: labId ? { labId } : {},
      include: { lab: true, deployments: { include: { software: true } }, maintenanceLogs: { orderBy: { reportedDate: "desc" }, take: 1 } },
      orderBy: { computerId: "asc" },
    });
    return { success: true, data: computers };
  } catch (e: any) {
    return { success: false, error: "Failed to retrieve computers." };
  }
}

export async function getComputerById(id: string): Promise<ServiceResult> {
  try {
    const computer = await prisma.computer.findUnique({
      where: { id },
      include: {
        lab: true,
        deployments: { include: { software: true } },
        maintenanceLogs: { orderBy: { reportedDate: "desc" } },
        movementHistory: { orderBy: { movedDate: "desc" } },
      },
    });
    if (!computer) return { success: false, error: "Computer not found." };
    return { success: true, data: computer };
  } catch (e: any) {
    return { success: false, error: "Failed to retrieve computer record." };
  }
}

export async function saveComputer(data: any, authorId?: any, ...args: any[]): Promise<ServiceResult> {
  try {
    const { id, lab, createdAt, updatedAt, deployments, maintenanceLogs, movementHistory, ...schemaData } = data;
    if (!schemaData.lastServiceDate) schemaData.lastServiceDate = null;
    if (!schemaData.nextServiceDate) schemaData.nextServiceDate = null;
    if (!schemaData.installedDate) schemaData.installedDate = null;
    const parsed = computerSchema.parse(schemaData);
    const safeAuthorId = String(authorId || "system");

    const result = await prisma.$transaction(async (tx) => {
      const existing = id
        ? await tx.computer.findUnique({ where: { id } })
        : await tx.computer.findUnique({ where: { computerId: parsed.computerId } });

      let savedComp;
      if (existing) {
        savedComp = await tx.computer.update({ where: { id: existing.id }, data: parsed });
        await tx.auditLog.create({ data: { userId: safeAuthorId, actionPerformed: "Updated computer record", tableName: "Computer", recordId: savedComp.id, previousValue: JSON.stringify(existing), updatedValue: JSON.stringify(savedComp), ipAddress: "127.0.0.1", browserAgent: "Server Action" } });
      } else {
        savedComp = await tx.computer.create({ data: parsed });
        await tx.auditLog.create({ data: { userId: safeAuthorId, actionPerformed: "Registered new computer", tableName: "Computer", recordId: savedComp.id, updatedValue: JSON.stringify(savedComp), ipAddress: "127.0.0.1", browserAgent: "Server Action" } });
      }
      return savedComp;
    });

    revalidatePath("/admin/computers");
    return { success: true, data: result };
  } catch (e: any) {
    console.error("saveComputer:", e);
    return { success: false, error: e.message || "Failed to save computer." };
  }
}

export async function deleteComputer(id: any, authorId: any, ...args: any[]): Promise<ServiceResult> {
  try {
    const stringId = String(id);
    await prisma.$transaction(async (tx) => {
      const comp = await tx.computer.findUnique({ where: { id: stringId } });
      if (!comp) throw new Error("Computer not found.");
      await tx.computer.delete({ where: { id: stringId } });
      await tx.auditLog.create({ data: { userId: String(authorId || "system"), actionPerformed: "Decommissioned computer", tableName: "Computer", recordId: stringId, previousValue: JSON.stringify(comp), ipAddress: "127.0.0.1", browserAgent: "Server Action" } });
    });
    revalidatePath("/admin/computers");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Delete failed." };
  }
}

export async function recordComputerMovement(computerId: string, fromLabName: string, toLabName: string, toLabId: string, movedBy: string, reason: string): Promise<ServiceResult> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.movementHistory.create({ data: { computerId, fromLabName, toLabName, movedBy, reason } });
      await tx.computer.update({ where: { id: computerId }, data: { labId: toLabId } });
    });
    revalidatePath("/admin/computers");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Movement record failed." };
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   4. MAINTENANCE REGISTER
══════════════════════════════════════════════════════════════════════════════ */

export async function getMaintenanceLogs(filters?: { labId?: string; status?: string; computerId?: string }): Promise<ServiceResult> {
  try {
    const where: any = {};
    if (filters?.labId) where.labId = filters.labId;
    if (filters?.status) where.status = filters.status;
    if (filters?.computerId) where.computerId = filters.computerId;
    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { lab: true, computer: true },
      orderBy: { reportedDate: "desc" },
    });
    return { success: true, data: logs };
  } catch (e: any) {
    return { success: false, error: "Failed to fetch maintenance logs." };
  }
}

export async function saveMaintenanceLog(data: any, authorId?: any, ...args: any[]): Promise<ServiceResult> {
  try {
    const { id, lab, computer, ...schemaData } = data;
    const parsed = maintenanceSchema.parse(schemaData);
    const safeAuthorId = String(authorId || "system");

    const result = await prisma.$transaction(async (tx) => {
      let log;
      if (id) {
        const existing = await tx.maintenanceLog.findUnique({ where: { id } });
        if (!existing) throw new Error("Maintenance record not found.");
        log = await tx.maintenanceLog.update({ where: { id }, data: parsed });
        await tx.auditLog.create({ data: { userId: safeAuthorId, actionPerformed: "Updated maintenance log", tableName: "MaintenanceLog", recordId: id, previousValue: JSON.stringify(existing), updatedValue: JSON.stringify(log), ipAddress: "127.0.0.1", browserAgent: "Server Action" } });
      } else {
        const maintenanceId = `MN-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
        log = await tx.maintenanceLog.create({ data: { ...parsed, maintenanceId } });
        await tx.computer.update({ where: { id: parsed.computerId }, data: { condition: "FAULTY", status: "UNDER_REPAIR" } });
        await tx.auditLog.create({ data: { userId: safeAuthorId, actionPerformed: "Filed new maintenance ticket", tableName: "MaintenanceLog", recordId: log.id, updatedValue: JSON.stringify(log), ipAddress: "127.0.0.1", browserAgent: "Server Action" } });
      }
      return log;
    });
    revalidatePath("/admin/maintenance");
    return { success: true, data: result };
  } catch (e: any) {
    console.error("saveMaintenanceLog:", e);
    return { success: false, error: e.message || "Failed to save maintenance log." };
  }
}

export async function updateMaintenanceStatus(id: any, newStatus: string, remarks: string, authorId?: any): Promise<ServiceResult> {
  try {
    const strId = String(id);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.maintenanceLog.findUnique({ where: { id: strId } });
      if (!existing) throw new Error("Ticket not found.");
      const updated = await tx.maintenanceLog.update({
        where: { id: strId },
        data: { status: newStatus as any, remarks, completionDate: ["RESOLVED", "CLOSED"].includes(newStatus) ? new Date() : undefined },
      });
      if (["RESOLVED", "CLOSED"].includes(newStatus)) {
        await tx.computer.update({ where: { id: updated.computerId }, data: { condition: "WORKING", status: "ONLINE", lastServiceDate: new Date() } });
      }
      await tx.auditLog.create({ data: { userId: String(authorId || "system"), actionPerformed: `Maintenance status → ${newStatus}`, tableName: "MaintenanceLog", recordId: strId, previousValue: JSON.stringify(existing), updatedValue: JSON.stringify(updated), ipAddress: "127.0.0.1", browserAgent: "Server Action" } });
    });
    revalidatePath("/admin/maintenance");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Status update failed." };
  }
}

export async function deleteMaintenanceLog(id: any, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.maintenanceLog.delete({ where: { id: String(id) } });
    revalidatePath("/admin/maintenance");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to delete maintenance log." };
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   5. LABORATORIES
══════════════════════════════════════════════════════════════════════════════ */

export async function getLaboratories(): Promise<ServiceResult> {
  try {
    const labs = await prisma.lab.findMany({
      include: {
        computers: { select: { id: true, status: true, condition: true } },
        maintenanceLogs: { where: { status: { notIn: ["RESOLVED", "CLOSED"] } }, select: { id: true } },
        bookings: { where: { bookingDate: { gte: new Date(new Date().setHours(0,0,0,0)), lt: new Date(new Date().setHours(23,59,59,999)) } }, select: { id: true, timeSlot: true, facultyName: true } },
      },
      orderBy: { name: "asc" },
    });
    return { success: true, data: labs, labs };
  } catch (e: any) {
    return { success: false, error: "Failed to fetch labs." };
  }
}

export async function getLabById(id: string): Promise<ServiceResult> {
  try {
    const lab = await prisma.lab.findUnique({
      where: { id },
      include: {
        computers: true,
        maintenanceLogs: { orderBy: { reportedDate: "desc" }, take: 20 },
        inventory: true,
        bookings: { orderBy: { bookingDate: "desc" }, take: 20, include: { user: true } },
        labStaff: { include: { user: true } },
      },
    });
    if (!lab) return { success: false, error: "Lab not found." };
    return { success: true, data: lab };
  } catch (e: any) {
    return { success: false, error: "Failed to fetch lab." };
  }
}

export async function saveLaboratory(data: any, ...args: any[]): Promise<ServiceResult> {
  try {
    const { id, computers, maintenanceLogs, inventory, bookings, labStaff, ...schemaData } = data;
    const parsed = labSchema.parse({ ...schemaData, seatingCapacity: Number(schemaData.seatingCapacity || 30), totalComputers: Number(schemaData.totalComputers || 0), switchesCount: Number(schemaData.switchesCount || 2) });
    let lab;
    if (id) {
      lab = await prisma.lab.update({ where: { id }, data: parsed });
    } else {
      lab = await prisma.lab.upsert({
        where: { code: parsed.code },
        update: parsed,
        create: parsed,
      });
    }
    revalidatePath("/admin/labs");
    return { success: true, data: lab };
  } catch (e: any) {
    console.error("saveLaboratory:", e);
    return { success: false, error: e.message || "Failed to save lab." };
  }
}

export async function deleteLaboratory(id: any, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.lab.delete({ where: { id: String(id) } });
    revalidatePath("/admin/labs");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to delete lab." };
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   6. INVENTORY
══════════════════════════════════════════════════════════════════════════════ */

export async function getInventory(labId?: string): Promise<ServiceResult> {
  try {
    const list = await prisma.inventory.findMany({
      where: labId ? { labId } : {},
      include: { lab: true, lifecycleLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: list };
  } catch (e: any) {
    return { success: false, error: "Failed to fetch inventory." };
  }
}

export async function saveInventoryItem(data: any, authorId?: any, ...args: any[]): Promise<ServiceResult> {
  try {
    const { id, lab, lifecycleLogs, ...schemaData } = data;
    const payload = {
      labId: schemaData.labId,
      deviceType: schemaData.deviceType,
      assetNumber: schemaData.assetNumber,
      specifications: schemaData.specifications || {},
      purchaseDate: schemaData.purchaseDate ? new Date(schemaData.purchaseDate) : new Date(),
      warrantyDetails: schemaData.warrantyDetails || null,
      vendorDetails: schemaData.vendorDetails || null,
      status: schemaData.status || "AVAILABLE",
      stockCount: Number(schemaData.stockCount) || 1,
    };
    let item;
    if (id) {
      item = await prisma.inventory.update({ where: { id }, data: payload });
    } else {
      item = await prisma.inventory.upsert({ where: { assetNumber: payload.assetNumber }, update: payload, create: payload });
    }
    revalidatePath("/admin/inventory");
    return { success: true, data: item };
  } catch (e: any) {
    console.error("saveInventoryItem:", e);
    return { success: false, error: e.message || "Failed to save inventory item." };
  }
}

export async function deleteInventoryItem(id: any, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.inventory.delete({ where: { id: String(id) } });
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to delete inventory item." };
  }
}

export async function getAssetLifecycle(inventoryId?: string): Promise<ServiceResult> {
  try {
    const list = await prisma.assetLifecycle.findMany({
      where: inventoryId ? { inventoryId } : {},
      include: { inventory: { include: { lab: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: list };
  } catch (e: any) {
    return { success: false, error: "Failed to fetch asset lifecycle." };
  }
}

export async function saveAssetLifecycle(data: any, ...args: any[]): Promise<ServiceResult> {
  try {
    const payload = {
      inventoryId: data.inventoryId,
      purchaseDate: new Date(data.purchaseDate),
      warrantyExpiry: new Date(data.warrantyExpiry),
      amcDetails: data.amcDetails || null,
      lastMaintenance: data.lastMaintenance ? new Date(data.lastMaintenance) : null,
      nextMaintenance: data.nextMaintenance ? new Date(data.nextMaintenance) : null,
      depreciationRate: Number(data.depreciationRate) || 15,
      replacementRecommend: data.replacementRecommend || null,
    };
    const item = data.id
      ? await prisma.assetLifecycle.update({ where: { id: data.id }, data: payload })
      : await prisma.assetLifecycle.create({ data: payload });
    revalidatePath("/admin/inventory");
    return { success: true, data: item };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to save lifecycle." };
  }
}

export async function deleteAssetLifecycle(id: any, ...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

/* ══════════════════════════════════════════════════════════════════════════════
   7. LAB BOOKINGS
══════════════════════════════════════════════════════════════════════════════ */

export async function getLabBookings(filters?: { labId?: string; date?: string; userId?: string }): Promise<ServiceResult> {
  try {
    const where: any = {};
    if (filters?.labId) where.labId = filters.labId;
    if (filters?.date) {
      const d = new Date(filters.date);
      where.bookingDate = { gte: new Date(d.setHours(0,0,0,0)), lt: new Date(d.setHours(23,59,59,999)) };
    }
    if (filters?.userId) where.userId = filters.userId;
    const bookings = await prisma.labBooking.findMany({
      where,
      include: { lab: true, user: true },
      orderBy: [{ bookingDate: "desc" }, { timeSlot: "asc" }],
    });
    return { success: true, data: bookings };
  } catch (e: any) {
    return { success: false, error: "Failed to fetch bookings." };
  }
}

export async function saveLabBooking(data: any, authorId?: any): Promise<ServiceResult> {
  try {
    const { id, lab, user, ...payload } = data;
    const bookingData = {
      labId: payload.labId,
      userId: payload.userId || String(authorId || "system"),
      facultyName: payload.facultyName,
      timeSlot: payload.timeSlot,
      bookingDate: new Date(payload.bookingDate),
      subjectName: payload.subjectName,
      semester: payload.semester,
      studentCount: Number(payload.studentCount),
      approvalStatus: payload.approvalStatus || "Approved",
    };
    let booking;
    if (id) {
      booking = await prisma.labBooking.update({ where: { id }, data: bookingData });
    } else {
      // Check for conflict
      const conflict = await prisma.labBooking.findFirst({
        where: { labId: bookingData.labId, timeSlot: bookingData.timeSlot, bookingDate: bookingData.bookingDate },
      });
      if (conflict) return { success: false, error: `Lab already booked for ${bookingData.timeSlot} on this date.` };
      booking = await prisma.labBooking.create({ data: bookingData });
    }
    revalidatePath("/admin/bookings");
    return { success: true, data: booking };
  } catch (e: any) {
    console.error("saveLabBooking:", e);
    return { success: false, error: e.message || "Failed to save booking." };
  }
}

export async function deleteLabBooking(id: any): Promise<ServiceResult> {
  try {
    await prisma.labBooking.delete({ where: { id: String(id) } });
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to delete booking." };
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   8. DAILY WORK REGISTER
══════════════════════════════════════════════════════════════════════════════ */

export async function getDailyWorkLogs(filters?: { userId?: string; from?: string; to?: string }): Promise<ServiceResult> {
  try {
    const where: any = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.from || filters?.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }
    const logs = await prisma.dailyWorkRegister.findMany({
      where,
      include: { user: true },
      orderBy: { date: "desc" },
    });
    return { success: true, data: logs };
  } catch (e: any) {
    return { success: false, error: "Failed to fetch daily work logs." };
  }
}

export async function saveDailyWorkLog(data: any, authorId?: any): Promise<ServiceResult> {
  try {
    const { id, user, ...payload } = data;
    const logData = {
      userId: payload.userId || String(authorId || "system"),
      date: payload.date ? new Date(payload.date) : new Date(),
      tasksPerformed: payload.tasksPerformed,
      durationMinutes: Number(payload.durationMinutes),
      labScope: payload.labScope,
      evidenceUrl: payload.evidenceUrl || null,
      remarks: payload.remarks || null,
    };
    const log = id
      ? await prisma.dailyWorkRegister.update({ where: { id }, data: logData })
      : await prisma.dailyWorkRegister.create({ data: logData });
    revalidatePath("/admin/daily-work");
    return { success: true, data: log };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to save work log." };
  }
}

export async function deleteDailyWorkLog(id: any): Promise<ServiceResult> {
  try {
    await prisma.dailyWorkRegister.delete({ where: { id: String(id) } });
    revalidatePath("/admin/daily-work");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to delete work log." };
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   9. VISITOR REGISTER
══════════════════════════════════════════════════════════════════════════════ */

export async function getVisitors(date?: string): Promise<ServiceResult> {
  try {
    const where: any = {};
    if (date) {
      const d = new Date(date);
      where.entryTime = { gte: new Date(d.setHours(0,0,0,0)), lt: new Date(d.setHours(23,59,59,999)) };
    }
    const visitors = await prisma.visitorRegister.findMany({ where, orderBy: { entryTime: "desc" } });
    return { success: true, data: visitors };
  } catch (e: any) {
    return { success: false, error: "Failed to fetch visitors." };
  }
}

export async function saveVisitor(data: any): Promise<ServiceResult> {
  try {
    const { id, ...payload } = data;
    const visitorData = {
      visitorName: payload.visitorName,
      purpose: payload.purpose,
      approvedBy: payload.approvedBy,
      entryTime: payload.entryTime ? new Date(payload.entryTime) : new Date(),
      exitTime: payload.exitTime ? new Date(payload.exitTime) : null,
    };
    const visitor = id
      ? await prisma.visitorRegister.update({ where: { id }, data: visitorData })
      : await prisma.visitorRegister.create({ data: visitorData });
    revalidatePath("/admin/visitors");
    return { success: true, data: visitor };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to save visitor." };
  }
}

export async function markVisitorExit(id: string): Promise<ServiceResult> {
  try {
    await prisma.visitorRegister.update({ where: { id }, data: { exitTime: new Date() } });
    revalidatePath("/admin/visitors");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to mark exit." };
  }
}

export async function deleteVisitor(id: any): Promise<ServiceResult> {
  try {
    await prisma.visitorRegister.delete({ where: { id: String(id) } });
    revalidatePath("/admin/visitors");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to delete visitor entry." };
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   10. SOFTWARE CATALOG & DEPLOYMENTS
══════════════════════════════════════════════════════════════════════════════ */

export async function getSoftwareCatalog(): Promise<ServiceResult> {
  try {
    const list = await prisma.software.findMany({
      include: { deployments: { include: { computer: { include: { lab: true } } } } },
      orderBy: { name: "asc" },
    });
    return { success: true, data: list };
  } catch (e: any) {
    return { success: false, error: "Failed to fetch software catalog." };
  }
}

export async function saveSoftware(data: any): Promise<ServiceResult> {
  try {
    const { id, deployments, requests, ...payload } = data;
    const softwareData = {
      name: payload.name,
      category: payload.category,
      latestVersion: payload.latestVersion,
      installationFiles: payload.installationFiles || null,
      licenseDetails: payload.licenseDetails || "",
      licenseExpiry: payload.licenseExpiry ? new Date(payload.licenseExpiry) : null,
      licenseKeys: payload.licenseKeys || null,
      installationGuide: payload.installationGuide || null,
      compatibility: payload.compatibility || "Windows 11",
    };
    let software;
    if (id) {
      software = await prisma.software.update({ where: { id }, data: softwareData });
    } else {
      software = await prisma.software.upsert({ where: { name: softwareData.name }, update: softwareData, create: softwareData });
    }
    revalidatePath("/admin/software");
    return { success: true, data: software };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to save software." };
  }
}

export async function deleteSoftware(id: any): Promise<ServiceResult> {
  try {
    await prisma.software.delete({ where: { id: String(id) } });
    revalidatePath("/admin/software");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to delete software." };
  }
}

export async function getLabSoftwares(computerId?: string): Promise<ServiceResult> {
  try {
    const list = await prisma.softwareDeployment.findMany({
      where: computerId ? { computerId } : {},
      include: { computer: { include: { lab: true } }, software: true },
      orderBy: { installedDate: "desc" },
    });
    return { success: true, data: list };
  } catch (e: any) {
    return { success: true, data: [] };
  }
}

export async function saveLabSoftware(data: any, ...args: any[]): Promise<ServiceResult> {
  try {
    const { id, computer, software, ...payload } = data;
    const deploymentData = {
      computerId: payload.computerId,
      softwareId: payload.softwareId,
      installedVersion: payload.installedVersion || "1.0",
      installedBy: payload.installedBy || "Admin",
      installedDate: payload.installedDate ? new Date(payload.installedDate) : new Date(),
      verificationStatus: payload.verificationStatus || "Verified",
    };
    if (id) {
      await prisma.softwareDeployment.update({ where: { id }, data: deploymentData });
    } else {
      await prisma.softwareDeployment.upsert({
        where: { computerId_softwareId: { computerId: deploymentData.computerId, softwareId: deploymentData.softwareId } },
        update: deploymentData,
        create: deploymentData,
      });
    }
    revalidatePath("/admin/software");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to save deployment." };
  }
}

export async function deleteLabSoftware(id: any, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.softwareDeployment.delete({ where: { id: String(id) } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to remove deployment." };
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   11. DOCUMENT REPOSITORY
══════════════════════════════════════════════════════════════════════════════ */

export async function getDocumentRepo(category?: string): Promise<ServiceResult> {
  try {
    const list = await prisma.documentRepository.findMany({
      where: category ? { category } : {},
      orderBy: { uploadDate: "desc" },
    });
    return { success: true, data: list };
  } catch (e: any) {
    return { success: true, data: [] };
  }
}

export async function saveDocument(data: any, authorId?: any): Promise<ServiceResult> {
  try {
    const { id, ...payload } = data;
    const docData = {
      category: payload.category,
      documentName: payload.documentName,
      fileUrl: payload.fileUrl,
      associatedLabId: payload.associatedLabId || null,
      uploadedBy: payload.uploadedBy || String(authorId || "Admin"),
      remarks: payload.remarks || null,
    };
    const doc = id
      ? await prisma.documentRepository.update({ where: { id }, data: docData })
      : await prisma.documentRepository.create({ data: docData });
    revalidatePath("/admin/documents");
    return { success: true, data: doc };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to save document." };
  }
}

export async function deleteDocument(id: any, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.documentRepository.delete({ where: { id: String(id) } });
    revalidatePath("/admin/documents");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to delete document." };
  }
}

export async function getNaacDocs(): Promise<ServiceResult> {
  return getDocumentRepo("NAAC");
}

export async function saveNaacDoc(data: any, ...args: any[]): Promise<ServiceResult> {
  return saveDocument({ ...data, category: "NAAC" });
}

export async function deleteNaacDoc(id: any, ...args: any[]): Promise<ServiceResult> {
  return deleteDocument(id);
}

/* ══════════════════════════════════════════════════════════════════════════════
   12. USER / ADMIN MANAGEMENT
══════════════════════════════════════════════════════════════════════════════ */

export async function getAdmins(): Promise<ServiceResult> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        mobile: true,
        designation: true,
        profilePhoto: true,
        skills: true,
        experienceYears: true,
        createdAt: true,
        labStaff: {
          select: {
            labId: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return { success: true, data: users };
  } catch (e: any) {
    return { success: true, data: [] };
  }
}

export async function saveAdmin(data: any, ...args: any[]): Promise<ServiceResult> {
  try {
    const { id, ...payload } = data;
    const userData = {
      employeeId: payload.employeeId,
      name: payload.name,
      email: payload.email,
      mobile: payload.mobile || "9999999999",
      designation: payload.designation || "Assistant",
      skills: payload.skills || [],
      experienceYears: Number(payload.experienceYears) || 0,
    };
    
    const user = await prisma.$transaction(async (tx) => {
      const savedUser = id
        ? await tx.user.update({
            where: { id },
            data: {
              ...userData,
              passwordHash: payload.password ? hashValue(payload.password) : undefined,
            },
          })
        : await tx.user.create({
            data: {
              ...userData,
              passwordHash: payload.password ? hashValue(payload.password) : hashValue("scsit@2026"),
            },
          });

      if (payload.assignedLabIds && Array.isArray(payload.assignedLabIds)) {
        await tx.labStaff.deleteMany({ where: { userId: savedUser.id } });
        if (payload.assignedLabIds.length > 0) {
          await tx.labStaff.createMany({
            data: payload.assignedLabIds.map((labId: string) => ({
              userId: savedUser.id,
              labId,
            })),
          });
        }
      }
      return savedUser;
    });

    return { success: true, data: user };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to save admin." };
  }
}

export async function deleteAdmin(id: any, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.user.delete({ where: { id: String(id) } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to delete admin." };
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   13. SETTINGS
══════════════════════════════════════════════════════════════════════════════ */

export async function getSettings(...args: any[]): Promise<ServiceResult> {
  try {
    const rows = await prisma.settings.findMany();
    const settingsMap: Record<string, string> = {};
    rows.forEach(r => { settingsMap[r.key] = r.value; });
    return { success: true, settings: settingsMap };
  } catch (e: any) {
    return { success: true, settings: {} };
  }
}

export async function updateSetting(key: string, value: string, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.settings.upsert({ where: { key }, update: { value }, create: { key, value } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to update setting." };
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   14. AUDIT LOGS
══════════════════════════════════════════════════════════════════════════════ */

export async function getAuditLogs(limit?: number): Promise<ServiceResult> {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { timestamp: "desc" },
      take: limit || 200,
    });
    return { success: true, data: logs };
  } catch (e: any) {
    return { success: false, error: "Failed to fetch audit logs." };
  }
}

export async function clearAuditLogs(...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.auditLog.deleteMany();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to clear audit logs." };
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   15. LEGACY COMPATIBILITY (keep old signatures working)
══════════════════════════════════════════════════════════════════════════════ */

export async function getSubmissions(): Promise<ServiceResult> {
  try {
    const list = await prisma.softwareRequest.findMany({ include: { software: true } });
    return { success: true, data: list };
  } catch (e) {
    return { success: true, data: [] };
  }
}

export async function deleteSubmission(id: any, ...args: any[]): Promise<ServiceResult> {
  try {
    await prisma.softwareRequest.delete({ where: { id: String(id) } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: "Failed to delete submission." };
  }
}

export async function updateClassStatusAndRemarks(...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function adminCreateSubmission(...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function getDepartmentDetails(): Promise<ServiceResult> {
  const settings = await getSettings();
  return {
    success: true,
    data: {
      department_name: settings.settings?.department_name || "SCSIT",
      academic_year: settings.settings?.academic_year || "2026-27",
      coordinator_name: settings.settings?.coordinator_name || "Dr. Coordinator",
      lab_coordinator_name: settings.settings?.lab_coordinator || "Lab In-charge",
      total_labs: 9,
    },
  };
}

export async function updateDepartmentDetails(data: any, ...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function getIeeeCompliance(): Promise<ServiceResult> {
  return getDocumentRepo("IEEE");
}

export async function saveIeeeCompliance(...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function deleteIeeeCompliance(...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function importAssetsBulk(...args: any[]): Promise<ServiceResult> {
  return { success: true };
}

export async function getImportLogs(...args: any[]): Promise<ServiceResult> {
  return { success: true, data: [] };
}

export async function submitForm(data: any, ...args: any[]): Promise<ServiceResult> {
  return { success: true, data: { submissionId: "SUB-" + Math.floor(1000 + Math.random() * 9000), createdAt: new Date().toISOString() } };
}

export async function lookupSubmissionStatus(...args: any[]): Promise<ServiceResult> {
  return { success: true, data: [] };
}

export async function getComputerByTag(tag: string): Promise<ServiceResult> {
  try {
    const computer = await prisma.computer.findFirst({
      where: {
        OR: [
          { computerId: { equals: tag, mode: 'insensitive' } },
          { hostname: { equals: tag, mode: 'insensitive' } },
          { barcode: { equals: tag, mode: 'insensitive' } },
          { qrCode: { equals: tag, mode: 'insensitive' } },
          { ipAddress: { equals: tag, mode: 'insensitive' } }
        ]
      },
      include: {
        lab: true,
        deployments: { include: { software: true } },
        maintenanceLogs: { orderBy: { reportedDate: "desc" } },
        movementHistory: { orderBy: { movedDate: "desc" } },
      }
    });
    if (!computer) return { success: false, error: "No system matching this tag, hostname, or IP was found." };
    return { success: true, data: computer };
  } catch (e: any) {
    return { success: false, error: "Database lookup failed." };
  }
}

export async function importComputers(computersList: any[], authorId?: any): Promise<ServiceResult> {
  try {
    const safeAuthorId = String(authorId || "system");
    const results = await prisma.$transaction(async (tx) => {
      const createdCount = [];
      for (const compData of computersList) {
        let lab = await tx.lab.findFirst({
          where: {
            OR: [
              { code: { equals: compData.labCode || "", mode: 'insensitive' } },
              { name: { equals: compData.labName || "", mode: 'insensitive' } }
            ]
          }
        });
        
        if (!lab) {
          lab = await tx.lab.findFirst() || await tx.lab.create({
            data: {
              name: compData.labName || "General Lab",
              code: compData.labCode || "GEN-LAB",
              building: "EB",
              floor: "1",
              location: "EB Floor 1",
              seatingCapacity: 30,
              totalComputers: 30,
              operatingSystem: "Windows 11 Pro",
              primaryPurpose: "General Programming"
            }
          });
        }

        const payload = {
          computerId: compData.computerId,
          hostname: compData.hostname || `PC-${compData.computerId}`,
          labId: lab.id,
          benchNumber: String(compData.benchNumber || "0"),
          ipAddress: compData.ipAddress || `192.168.1.${10 + Math.floor(Math.random() * 200)}`,
          macAddress: compData.macAddress || `00:0A:95:9D:68:16`,
          cpu: compData.cpu || "Intel Core i5",
          motherboard: compData.motherboard || "Gigabyte H610",
          ramGb: Number(compData.ramGb || 8),
          ssdGb: Number(compData.ssdGb || 256),
          hddGb: Number(compData.hddGb || 0),
          monitorDetails: compData.monitorDetails || "Dell 19.5 Inch",
          keyboardBrand: compData.keyboardBrand || "Logitech",
          mouseBrand: compData.mouseBrand || "Logitech",
          vendorDetails: compData.vendorDetails || "Symbiosis Authorized Vendor",
          operatingSystem: compData.operatingSystem || "Windows 11 Pro",
          purchaseDate: compData.purchaseDate ? new Date(compData.purchaseDate) : new Date(),
          warrantyExpiry: compData.warrantyExpiry ? new Date(compData.warrantyExpiry) : new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000),
          status: compData.status || "ONLINE",
          condition: compData.condition || "WORKING",
          barcode: compData.barcode || compData.computerId,
          qrCode: compData.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${compData.computerId}`,
        };

        const existing = await tx.computer.findUnique({
          where: { computerId: payload.computerId }
        });

        let saved;
        if (existing) {
          saved = await tx.computer.update({
            where: { id: existing.id },
            data: payload
          });
        } else {
          saved = await tx.computer.create({
            data: payload
          });
        }
        createdCount.push(saved);
      }

      await tx.auditLog.create({
        data: {
          userId: safeAuthorId,
          actionPerformed: `Bulk imported ${createdCount.length} computer records`,
          tableName: "Computer",
          recordId: "BULK_IMPORT",
          updatedValue: JSON.stringify({ count: createdCount.length }),
          ipAddress: "127.0.0.1",
          browserAgent: "Server Action Engine"
        }
      });

      return createdCount;
    });

    revalidatePath("/admin/computers");
    return { success: true, data: results };
  } catch (e: any) {
    console.error("importComputers error:", e);
    return { success: false, error: e.message || "Bulk import failed." };
  }
}
