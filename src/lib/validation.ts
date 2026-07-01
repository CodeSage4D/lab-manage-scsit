import { z } from "zod";

export const userSchema = z.object({
  employeeId: z.string().min(2, "Employee ID must be at least 2 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  mobile: z.string().regex(/^\d{10}$/, "Mobile must be exactly 10 digits"),
  designation: z.string().min(2, "Designation is required"),
  skills: z.array(z.string()).default([]),
  certificates: z.array(z.string()).default([]),
  experienceYears: z.number().int().nonnegative().default(0),
});

export const labSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  code: z.string().min(2, "Code must be at least 2 characters"),
  building: z.string().default("EB"),
  floor: z.string().min(1, "Floor is required"),
  location: z.string().min(2, "Location is required"),
  seatingCapacity: z.number().int().positive(),
  totalComputers: z.number().int().nonnegative(),
  operatingSystem: z.string().min(2, "Operating System specification is required"),
  primaryPurpose: z.string().min(2, "Primary Purpose is required"),
  operatingHours: z.string().default("09:00 - 17:00"),
  switchesCount: z.number().int().nonnegative().default(2),
  internetSpeed: z.string().default("1 Gbps"),
});

export const computerSchema = z.object({
  computerId: z.string().min(3, "Computer ID is required"),
  hostname: z.string().min(2, "Hostname is required"),
  labId: z.string().uuid("Invalid Lab selection"),
  benchNumber: z.string().min(1, "Bench Number is required"),
  ipAddress: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, "Invalid IP Address format"),
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, "Invalid MAC Address format"),
  cpu: z.string().min(2, "CPU specification is required"),
  motherboard: z.string().min(2, "Motherboard specification is required"),
  ramGb: z.number().int().positive("RAM size must be positive"),
  ssdGb: z.number().int().nonnegative(),
  hddGb: z.number().int().nonnegative(),
  gpu: z.string().optional(),
  monitorDetails: z.string().min(2, "Monitor details are required"),
  keyboardBrand: z.string().min(2, "Keyboard brand is required"),
  mouseBrand: z.string().min(2, "Mouse brand is required"),
  upsDetails: z.string().optional(),
  purchaseDate: z.coerce.date(),
  warrantyExpiry: z.coerce.date(),
  vendorDetails: z.string().min(2, "Vendor details are required"),
  operatingSystem: z.string().min(2, "Operating system is required"),
  windowsKey: z.string().optional(),
  biosVersion: z.string().optional(),
  remarks: z.string().optional(),
});

export const maintenanceSchema = z.object({
  labId: z.string().uuid("Invalid Lab selection"),
  computerId: z.string().uuid("Invalid Computer selection"),
  pcNumber: z.string().min(1, "PC identification number is required"),
  systemMake: z.string().min(2, "System make is required"),
  systemModel: z.string().min(2, "System model is required"),
  serialNumber: z.string().min(2, "Serial number is required"),
  issueDescription: z.string().min(5, "Issue description must be at least 5 characters"),
  reportedDate: z.coerce.date().default(() => new Date()),
  technicianName: z.string().min(2, "Technician name is required"),
  remarks: z.string().optional(),
});

export const inventorySchema = z.object({
  labId: z.string().uuid("Invalid Lab selection"),
  deviceType: z.string().min(2, "Device type is required"),
  assetNumber: z.string().min(3, "Asset number is required"),
  specifications: z.record(z.string(), z.any()),
  purchaseDate: z.coerce.date(),
  warrantyDetails: z.string().optional(),
  vendorDetails: z.string().optional(),
  stockCount: z.number().int().nonnegative().default(1),
});

export const labBookingSchema = z.object({
  labId: z.string().uuid("Invalid Lab selection"),
  facultyName: z.string().min(2, "Faculty name is required"),
  timeSlot: z.string().min(2, "Time slot is required"),
  bookingDate: z.coerce.date(),
  subjectName: z.string().min(2, "Subject name is required"),
  semester: z.string().min(2, "Semester is required"),
  studentCount: z.number().int().positive(),
});

export const dailyWorkSchema = z.object({
  tasksPerformed: z.string().min(5, "Tasks performed must be described"),
  durationMinutes: z.number().int().positive("Duration must be positive"),
  labScope: z.string().min(2, "Lab Scope is required"),
  remarks: z.string().optional(),
});

export const visitorSchema = z.object({
  visitorName: z.string().min(2, "Visitor name is required"),
  purpose: z.string().min(3, "Purpose must be specified"),
  approvedBy: z.string().min(2, "Approver name is required"),
});
