"use server";

import { neon } from "@neondatabase/serverless";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// Derived stable key (32 bytes) for AES-256
const ENCRYPTION_KEY = scryptSync(
  process.env.DATABASE_URL || "suas-default-secret-salt-key-2026",
  "suas-salt",
  32
);

// Encrypt plain text using AES-256-CBC
function encrypt(text: string): string {
  if (!text) return "";
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

// Decrypt ciphertext using AES-256-CBC
function decrypt(cipherText: string): string {
  if (!cipherText) return "";
  try {
    if (!cipherText.includes(":")) return cipherText; // Return plain text if not formatted as iv:ciphertext
    const parts = cipherText.split(":");
    const iv = Buffer.from(parts.shift()!, "hex");
    const encryptedText = Buffer.from(parts.join(":"), "hex");
    const decipher = createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption failed:", error);
    return cipherText;
  }
}

// Helper to get Neon client
function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in environment variables");
  }
  return neon(process.env.DATABASE_URL);
}

let dbInitialized = false;

/**
 * Initializes the Postgres tables on Neon if they don't already exist and seeds default values.
 */
export async function initDatabase() {
  if (dbInitialized) return;
  try {
    const sql = getSql();
    
    // Create settings table first
    await sql`
      CREATE TABLE IF NOT EXISTS suas_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `;

    // Create admins table
    await sql`
      CREATE TABLE IF NOT EXISTS suas_admins (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        assigned_labs TEXT NOT NULL,
        role VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        profile_photo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create submissions table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS suas_submissions (
        id SERIAL PRIMARY KEY,
        submission_id VARCHAR(50) UNIQUE NOT NULL,
        faculty_name VARCHAR(255) NOT NULL,
        faculty_email VARCHAR(255) NOT NULL,
        faculty_mobile VARCHAR(20) NOT NULL,
        department VARCHAR(100) NOT NULL,
        semester VARCHAR(50),
        subjects JSONB NOT NULL,
        signature_data TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Alter column size of faculty_mobile to accommodate encryption (idempotently to avoid exclusive lock hanging)
    const mobileColLengthResult = await sql`
      SELECT character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'suas_submissions' AND column_name = 'faculty_mobile'
    `;
    if (mobileColLengthResult[0]?.character_maximum_length && mobileColLengthResult[0].character_maximum_length < 255) {
      await sql`ALTER TABLE suas_submissions ALTER COLUMN faculty_mobile TYPE VARCHAR(255)`;
      console.log("Migration: Altered column 'faculty_mobile' to VARCHAR(255).");
    }

    // Add semester column if it doesn't exist (safety migration check)
    await sql`
      ALTER TABLE suas_submissions ADD COLUMN IF NOT EXISTS semester VARCHAR(50);
    `;

    // Idempotent check: Alter column size to accommodate multiple semesters safely
    const colLengthResult = await sql`
      SELECT character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'suas_submissions' AND column_name = 'semester'
    `;
    if (colLengthResult[0]?.character_maximum_length && colLengthResult[0].character_maximum_length < 255) {
      await sql`ALTER TABLE suas_submissions ALTER COLUMN semester TYPE VARCHAR(255)`;
      console.log("Migration: Altered column 'semester' to VARCHAR(255).");
    }

    // Create GIN index on subjects JSONB column for search performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_suas_submissions_subjects ON suas_submissions USING gin (subjects);
    `;
    console.log("Migration: Ensured GIN index on 'subjects' JSONB column exists.");

    // Seed default administrators if the table is empty or new Super Admin N5428 is missing (exactly 5 default heads)
    const adminCountResult = await sql`SELECT COUNT(*)::int as total FROM suas_admins`;
    const hasNewSuperAdmin = await sql`SELECT COUNT(*)::int as total FROM suas_admins WHERE id = 'N5428'`;
    
    if (adminCountResult[0]?.total === 0 || hasNewSuperAdmin[0]?.total === 0) {
      // Clear out legacy default users to avoid stale profiles
      await sql`DELETE FROM suas_admins WHERE id IN ('admin', 'it.staff1', 'it.staff2', 'it.staff3', 'trainer1', 'assistant1')`;
      
      await sql`
        INSERT INTO suas_admins (id, name, email, mobile, assigned_labs, role, password, profile_photo)
        VALUES 
        ('N5428', 'Karan Mishra', 'Karan.mishra@suas.ac.in', '9999999901', 'Lab A,Lab B,Lab C,Lab D,Lab E,Lab F,Lab G,Lab H,Lab I', 'Director Admin', '@dn1m@26', NULL),
        ('monark.raikwar', 'Monark Raikwar', 'monark.raikwar@suas.ac.in', '9999999902', 'Lab A,Lab B', 'Lab Assistant', '@dn1m@26', NULL),
        ('nitin.panchal', 'Nitin Panchal', 'nitin.panchal@suas.ac.in', '9999999903', 'Lab C,Lab D', 'Lab Assistant', '@dn1m@26', NULL),
        ('prashant.patil', 'Prashant Patil', 'prashant.patil@suas.ac.in', '9999999904', 'Lab E,Lab F', 'Lab Assistant', '@dn1m@26', NULL),
        ('salman.khan', 'Salman Khan', 'salman.khan@suas.ac.in', '9999999905', 'Lab G,Lab H,Lab I', 'Trainer of Practice', '@dn1m@26', NULL)
        ON CONFLICT (id) DO UPDATE SET 
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          mobile = EXCLUDED.mobile,
          assigned_labs = EXCLUDED.assigned_labs,
          role = EXCLUDED.role,
          password = EXCLUDED.password;
      `;
    }

    // Seed default settings if not present
    const statusTrackResult = await sql`SELECT COUNT(*)::int as total FROM suas_settings WHERE key = 'installation_status_enabled'`;
    if (statusTrackResult[0]?.total === 0) {
      await sql`INSERT INTO suas_settings (key, value) VALUES ('installation_status_enabled', 'true')`;
    }

    const activeSessionResult = await sql`SELECT COUNT(*)::int as total FROM suas_settings WHERE key = 'active_session'`;
    if (activeSessionResult[0]?.total === 0) {
      await sql`INSERT INTO suas_settings (key, value) VALUES ('active_session', 'July-Dec 2026')`;
    }

    const noticeTextResult = await sql`SELECT COUNT(*)::int as total FROM suas_settings WHERE key = 'notice_text'`;
    if (noticeTextResult[0]?.total === 0) {
      await sql`INSERT INTO suas_settings (key, value) VALUES ('notice_text', 'Notice: Software installation requests for the July-December 2026 Academic Session must be submitted before July 15, 2026. Please verify and confirm digital signatures.')`;
    }

    const labSelectionEnabledResult = await sql`SELECT COUNT(*)::int as total FROM suas_settings WHERE key = 'faculty_lab_selection_enabled'`;
    if (labSelectionEnabledResult[0]?.total === 0) {
      await sql`INSERT INTO suas_settings (key, value) VALUES ('faculty_lab_selection_enabled', 'false')`;
      console.log("Migration: Seeded 'faculty_lab_selection_enabled' default setting.");
    }

    // Create new tables for Modular LMS
    await sql`
      CREATE TABLE IF NOT EXISTS suas_department_details (
        id INT PRIMARY KEY,
        department_name VARCHAR(255) NOT NULL,
        academic_year VARCHAR(100) NOT NULL,
        coordinator_name VARCHAR(255) NOT NULL,
        lab_coordinator_name VARCHAR(255) NOT NULL,
        total_labs INT DEFAULT 0
      );
    `;

    await sql`
      INSERT INTO suas_department_details (id, department_name, academic_year, coordinator_name, lab_coordinator_name, total_labs)
      VALUES (1, 'SCSIT', 'July-Dec 2026', 'Dr. Karan Mishra', 'Monark Raikwar', 9)
      ON CONFLICT (id) DO NOTHING;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS suas_laboratories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        building VARCHAR(255) NOT NULL,
        floor VARCHAR(100) NOT NULL,
        location VARCHAR(255) NOT NULL,
        seating_capacity INT NOT NULL,
        total_computers INT NOT NULL,
        operating_system VARCHAR(255) NOT NULL,
        primary_purpose VARCHAR(255) NOT NULL,
        lab_in_charge VARCHAR(255) NOT NULL,
        lab_assistant VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Seed default laboratories if empty
    const labsCountRes = await sql`SELECT COUNT(*)::int as total FROM suas_laboratories`;
    if (labsCountRes[0]?.total === 0) {
      const defaultLabs = [
        { name: "Lab A", code: "LA", building: "Main Building", floor: "Ground Floor", location: "Room G-01", seating_capacity: 40, total_computers: 40, operating_system: "Windows 11 / Ubuntu", primary_purpose: "Programming & Data Structures", lab_in_charge: "Monark Raikwar", lab_assistant: "Monark Raikwar" },
        { name: "Lab B", code: "LB", building: "Main Building", floor: "Ground Floor", location: "Room G-02", seating_capacity: 40, total_computers: 40, operating_system: "Windows 11", primary_purpose: "Web Development", lab_in_charge: "Monark Raikwar", lab_assistant: "Monark Raikwar" },
        { name: "Lab C", code: "LC", building: "Main Building", floor: "First Floor", location: "Room 101", seating_capacity: 35, total_computers: 35, operating_system: "Windows 11 / Ubuntu", primary_purpose: "Database Management Systems", lab_in_charge: "Nitin Panchal", lab_assistant: "Nitin Panchal" },
        { name: "Lab D", code: "LD", building: "Main Building", floor: "First Floor", location: "Room 102", seating_capacity: 35, total_computers: 35, operating_system: "Windows 11", primary_purpose: "Java & Object Oriented Programming", lab_in_charge: "Nitin Panchal", lab_assistant: "Nitin Panchal" },
        { name: "Lab E", code: "LE", building: "Annex Building", floor: "Second Floor", location: "Room 201", seating_capacity: 30, total_computers: 30, operating_system: "Windows 11 / Ubuntu", primary_purpose: "AI / Machine Learning", lab_in_charge: "Prashant Patil", lab_assistant: "Prashant Patil" },
        { name: "Lab F", code: "LF", building: "Annex Building", floor: "Second Floor", location: "Room 202", seating_capacity: 30, total_computers: 30, operating_system: "Windows 11", primary_purpose: "Computer Networks & Security", lab_in_charge: "Prashant Patil", lab_assistant: "Prashant Patil" },
        { name: "Lab G", code: "LG", building: "Annex Building", floor: "Third Floor", location: "Room 301", seating_capacity: 45, total_computers: 45, operating_system: "Windows 11", primary_purpose: "Cloud Computing & DevOps", lab_in_charge: "Salman Khan", lab_assistant: "Salman Khan" },
        { name: "Lab H", code: "LH", building: "Annex Building", floor: "Third Floor", location: "Room 302", seating_capacity: 45, total_computers: 45, operating_system: "Windows 11 / Ubuntu", primary_purpose: "Mobile Application Development", lab_in_charge: "Salman Khan", lab_assistant: "Salman Khan" },
        { name: "Lab I", code: "LI", building: "Annex Building", floor: "Third Floor", location: "Room 303", seating_capacity: 50, total_computers: 50, operating_system: "Windows 11 / macOS", primary_purpose: "Internet of Things & Embedded Systems", lab_in_charge: "Salman Khan", lab_assistant: "Salman Khan" }
      ];
      for (const lab of defaultLabs) {
        await sql`
          INSERT INTO suas_laboratories (name, code, building, floor, location, seating_capacity, total_computers, operating_system, primary_purpose, lab_in_charge, lab_assistant, status)
          VALUES (${lab.name}, ${lab.code}, ${lab.building}, ${lab.floor}, ${lab.location}, ${lab.seating_capacity}, ${lab.total_computers}, ${lab.operating_system}, ${lab.primary_purpose}, ${lab.lab_in_charge}, ${lab.lab_assistant}, 'Active')
        `;
      }
    }

    await sql`
      CREATE TABLE IF NOT EXISTS suas_lab_softwares (
        id SERIAL PRIMARY KEY,
        lab_id INT REFERENCES suas_laboratories(id) ON DELETE CASCADE,
        software_name VARCHAR(255) NOT NULL,
        version VARCHAR(100) NOT NULL,
        framework VARCHAR(255),
        framework_version VARCHAR(100),
        license_type VARCHAR(100) NOT NULL,
        installation_date DATE NOT NULL,
        last_updated_date DATE NOT NULL,
        installed_by VARCHAR(255) NOT NULL,
        axn_request_id VARCHAR(50),
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS suas_maintenance_log (
        id SERIAL PRIMARY KEY,
        maintenance_id VARCHAR(50) UNIQUE NOT NULL,
        lab_id INT REFERENCES suas_laboratories(id) ON DELETE CASCADE,
        pc_number VARCHAR(100),
        system_make VARCHAR(255),
        system_model VARCHAR(255),
        serial_number VARCHAR(255),
        date DATE NOT NULL,
        time_stamp TIME,
        issue_description TEXT NOT NULL,
        reason_for_damage TEXT,
        action_taken TEXT,
        technician_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        completion_date DATE,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Add new columns to existing maintenance table if they don't exist
    await sql`ALTER TABLE suas_maintenance_log ADD COLUMN IF NOT EXISTS pc_number VARCHAR(100)`;
    await sql`ALTER TABLE suas_maintenance_log ADD COLUMN IF NOT EXISTS system_make VARCHAR(255)`;
    await sql`ALTER TABLE suas_maintenance_log ADD COLUMN IF NOT EXISTS system_model VARCHAR(255)`;
    await sql`ALTER TABLE suas_maintenance_log ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255)`;
    await sql`ALTER TABLE suas_maintenance_log ADD COLUMN IF NOT EXISTS reason_for_damage TEXT`;
    await sql`ALTER TABLE suas_maintenance_log ADD COLUMN IF NOT EXISTS time_stamp TIME`;

    await sql`
      CREATE TABLE IF NOT EXISTS suas_inventory (
        id SERIAL PRIMARY KEY,
        lab_id INT REFERENCES suas_laboratories(id) ON DELETE CASCADE,
        device_type VARCHAR(100) NOT NULL,
        asset_number VARCHAR(100) UNIQUE NOT NULL,
        cpu VARCHAR(255),
        ram VARCHAR(100),
        storage VARCHAR(100),
        monitor VARCHAR(255),
        printer_details VARCHAR(255),
        projector_details VARCHAR(255),
        ups_details VARCHAR(255),
        network_details VARCHAR(255),
        purchase_date DATE NOT NULL,
        warranty_details TEXT,
        vendor_details TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS suas_assets_lifecycle (
        id SERIAL PRIMARY KEY,
        inventory_id INT REFERENCES suas_inventory(id) ON DELETE CASCADE,
        purchase_date DATE NOT NULL,
        warranty_expiry DATE NOT NULL,
        amc_details TEXT,
        last_maintenance DATE,
        next_maintenance DATE,
        current_condition VARCHAR(100) NOT NULL,
        replacement_recommendation TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS suas_naac_docs (
        id SERIAL PRIMARY KEY,
        lab_id INT REFERENCES suas_laboratories(id) ON DELETE SET NULL,
        document_type VARCHAR(255) NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        uploaded_by VARCHAR(255) NOT NULL,
        remarks TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS suas_ieee_compliance (
        id SERIAL PRIMARY KEY,
        lab_id INT REFERENCES suas_laboratories(id) ON DELETE SET NULL,
        compliance_type VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content_text TEXT NOT NULL,
        file_url TEXT,
        last_reviewed_date DATE NOT NULL,
        reviewed_by VARCHAR(255) NOT NULL,
        status VARCHAR(100) DEFAULT 'Draft'
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS suas_document_repository (
        id SERIAL PRIMARY KEY,
        category VARCHAR(255) NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        associated_id VARCHAR(100),
        upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        uploaded_by VARCHAR(255) NOT NULL,
        remarks TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS suas_audit_logs (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        action_performed VARCHAR(255) NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        record_id VARCHAR(100) NOT NULL,
        previous_value TEXT,
        updated_value TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Seed default LMS module statuses
    const lmsModules = [
      "faculty_software_requests",
      "laboratory_management",
      "laboratory_software_records",
      "maintenance_register",
      "reports_dashboard",
      "laboratory_inventory",
      "asset_management",
      "notifications",
      "naac_documentation",
      "ieee_compliance",
      "document_repository",
      "search_audit_logs"
    ];

    for (const mod of lmsModules) {
      const isEnabledByDefault = [
        "faculty_software_requests",
        "laboratory_management",
        "laboratory_software_records",
        "maintenance_register",
        "reports_dashboard"
      ].includes(mod);
      const modKey = `module_${mod}`;
      const modCount = await sql`SELECT COUNT(*)::int as total FROM suas_settings WHERE key = ${modKey}`;
      if (modCount[0]?.total === 0) {
        await sql`INSERT INTO suas_settings (key, value) VALUES (${modKey}, ${isEnabledByDefault ? 'true' : 'false'})`;
      }
    }

    dbInitialized = true;
    return { success: true, message: "Database initialized successfully." };
  } catch (error: any) {
    console.error("Failed to initialize database:", error);
    return { success: false, error: error.message || "Failed to initialize database" };
  }
}

/**
 * Submits the unified faculty form containing multiple subject and software requirements.
 */
export async function submitForm(
  facultyData: { name: string; email: string; mobile: string; department: string; semester: string },
  subjects: any[],
  signature: string
) {
  try {
    const sql = getSql();
    
    // Ensure database is initialized
    await initDatabase();

    // Restrict to official SUAS domain validation
    if (!facultyData.email.trim().toLowerCase().endsWith("@suas.ac.in")) {
      return { success: false, error: "Please use your official SUAS email address (@suas.ac.in) to continue." };
    }

    // Generate Reference Number starting with AXN prefix (sequential)
    const lastSub = await sql`
      SELECT submission_id FROM suas_submissions
      WHERE submission_id LIKE 'AXN%'
      ORDER BY id DESC LIMIT 1
    `;
    let nextNum = 1;
    if (lastSub.length > 0) {
      const lastId = lastSub[0].submission_id;
      const match = lastId.match(/AXN(\d+)/i);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }
    const submissionId = `AXN${String(nextNum).padStart(6, '0')}`;

    // Initialize subject status details
    const initializedSubjects = subjects.map(s => ({
      ...s,
      status: s.status || "Pending",
      remarks: s.remarks || ""
    }));

    // Encrypt fields
    const encName = encrypt(facultyData.name);
    const encEmail = encrypt(facultyData.email.trim().toLowerCase());
    const encMobile = encrypt(facultyData.mobile);
    const encSignature = encrypt(signature);
    
    // Encrypted subjects JSON structure wrapper
    const encSubjects = { encrypted: encrypt(JSON.stringify(initializedSubjects)) };

    // Insert row
    const result = await sql`
      INSERT INTO suas_submissions (
        submission_id,
        faculty_name,
        faculty_email,
        faculty_mobile,
        department,
        semester,
        subjects,
        signature_data
      ) VALUES (
        ${submissionId},
        ${encName},
        ${encEmail},
        ${encMobile},
        ${facultyData.department},
        ${facultyData.semester},
        ${JSON.stringify(encSubjects)},
        ${encSignature}
      )
      RETURNING id, submission_id, created_at;
    `;

    return {
      success: true,
      data: {
        id: result[0].id,
        submissionId: result[0].submission_id,
        createdAt: result[0].created_at,
      }
    };
  } catch (error: any) {
    console.error("Failed to submit form:", error);
    return { success: false, error: error.message || "Failed to submit form" };
  }
}

/**
 * Fetches all submissions from Neon for the admin dashboard.
 */
export async function getSubmissions() {
  try {
    const sql = getSql();
    
    // Ensure table exists
    await initDatabase();

    const result = await sql`
      SELECT id, submission_id, faculty_name, faculty_email, faculty_mobile, department, semester, subjects, signature_data, created_at
      FROM suas_submissions
      ORDER BY created_at DESC
    `;

    return {
      success: true,
      data: result.map((row: any) => {
        let decryptedSubjects = [];
        try {
          const rawSubjects = typeof row.subjects === 'string' ? JSON.parse(row.subjects) : row.subjects;
          if (rawSubjects && rawSubjects.encrypted) {
            decryptedSubjects = JSON.parse(decrypt(rawSubjects.encrypted));
          } else {
            decryptedSubjects = Array.isArray(rawSubjects) ? rawSubjects : [];
          }
        } catch (e) {
          console.error("Failed to parse subjects:", e);
        }

        return {
          id: row.id,
          submissionId: row.submission_id,
          facultyName: decrypt(row.faculty_name),
          facultyEmail: decrypt(row.faculty_email),
          facultyMobile: decrypt(row.faculty_mobile),
          department: row.department,
          semester: row.semester,
          subjects: decryptedSubjects,
          signatureData: decrypt(row.signature_data),
          createdAt: row.created_at,
        };
      })
    };
  } catch (error: any) {
    console.error("Failed to get submissions:", error);
    return { success: false, error: error.message || "Failed to get submissions" };
  }
}

/**
 * Deletes a submission entry.
 */
export async function deleteSubmission(id: number) {
  try {
    const sql = getSql();
    await sql`
      DELETE FROM suas_submissions
      WHERE id = ${id}
    `;
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete submission:", error);
    return { success: false, error: error.message || "Failed to delete submission" };
  }
}

/**
 * Updates status and remarks/notes for a specific class inside a faculty submission.
 */
export async function updateClassStatusAndRemarks(
  submissionId: number, 
  classId: string, 
  status: string, 
  remarks: string, 
  licenseType?: string,
  labSelection?: string | null,
  subjectCode?: string,
  subjectName?: string,
  framework?: string,
  semesters?: string[],
  softwares?: any[]
) {
  try {
    const sql = getSql();
    const result = await sql`SELECT subjects FROM suas_submissions WHERE id = ${submissionId}`;
    if (result.length === 0) {
      return { success: false, error: "Submission not found" };
    }
    
    let subjects = [];
    try {
      const rawSubjects = typeof result[0].subjects === 'string' ? JSON.parse(result[0].subjects) : result[0].subjects;
      if (rawSubjects && rawSubjects.encrypted) {
        subjects = JSON.parse(decrypt(rawSubjects.encrypted));
      } else {
        subjects = Array.isArray(rawSubjects) ? rawSubjects : [];
      }
    } catch (e) {
      console.error("Failed to decrypt subjects in update:", e);
      subjects = [];
    }

    const updatedSubjects = subjects.map((sub: any) => {
      if (sub.id === classId) {
        return { 
          ...sub, 
          status: status !== undefined ? status : sub.status, 
          remarks: remarks !== undefined ? remarks : sub.remarks, 
          licenseType: licenseType !== undefined ? licenseType : (sub.licenseType || "FOSS/Open Source"),
          labSelection: labSelection !== undefined ? labSelection : sub.labSelection,
          subjectCode: subjectCode !== undefined ? subjectCode : sub.subjectCode,
          subjectName: subjectName !== undefined ? subjectName : sub.subjectName,
          framework: framework !== undefined ? framework : sub.framework,
          semesters: semesters !== undefined ? semesters : sub.semesters,
          softwares: softwares !== undefined ? softwares : sub.softwares
        };
      }
      return sub;
    });

    const encSubjects = { encrypted: encrypt(JSON.stringify(updatedSubjects)) };
    await sql`UPDATE suas_submissions SET subjects = ${JSON.stringify(encSubjects)} WHERE id = ${submissionId}`;
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update class status:", error);
    return { success: false, error: error.message || "Failed to update status" };
  }
}

/**
 * Allows the admin to manually create a request.
 */
export async function adminCreateSubmission(
  facultyData: { name: string; email: string; mobile: string; department: string; semester: string },
  subjects: any[],
  signature: string
) {
  try {
    const sql = getSql();
    await initDatabase();

    // Generate Reference Number starting with AXN prefix (sequential)
    const lastSub = await sql`
      SELECT submission_id FROM suas_submissions
      WHERE submission_id LIKE 'AXN%'
      ORDER BY id DESC LIMIT 1
    `;
    let nextNum = 1;
    if (lastSub.length > 0) {
      const lastId = lastSub[0].submission_id;
      const match = lastId.match(/AXN(\d+)/i);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }
    const submissionId = `AXN${String(nextNum).padStart(6, '0')}`;

    // Initialize subject status details
    const initializedSubjects = subjects.map(s => ({
      ...s,
      status: s.status || "Pending",
      remarks: s.remarks || ""
    }));

    // Encrypt fields
    const encName = encrypt(facultyData.name);
    const encEmail = encrypt(facultyData.email.trim().toLowerCase());
    const encMobile = encrypt(facultyData.mobile);
    const encSignature = encrypt(signature || "");
    const encSubjects = { encrypted: encrypt(JSON.stringify(initializedSubjects)) };

    // Insert row
    const result = await sql`
      INSERT INTO suas_submissions (
        submission_id,
        faculty_name,
        faculty_email,
        faculty_mobile,
        department,
        semester,
        subjects,
        signature_data
      ) VALUES (
        ${submissionId},
        ${encName},
        ${encEmail},
        ${encMobile},
        ${facultyData.department},
        ${facultyData.semester},
        ${JSON.stringify(encSubjects)},
        ${encSignature}
      )
      RETURNING id, submission_id, created_at;
    `;

    return {
      success: true,
      data: {
        id: result[0].id,
        submissionId: result[0].submission_id,
        createdAt: result[0].created_at,
      }
    };
  } catch (error: any) {
    console.error("Failed to create admin submission:", error);
    return { success: false, error: error.message || "Failed to create submission" };
  }
}

/**
 * Fetches all settings configs from Neon.
 */
export async function getSettings() {
  try {
    const sql = getSql();
    await initDatabase();
    const result = await sql`SELECT key, value FROM suas_settings`;
    const settings: Record<string, string> = {};
    result.forEach(row => {
      settings[row.key] = row.value;
    });
    return { success: true, settings };
  } catch (error: any) {
    console.error("Failed to get settings:", error);
    return { success: false, error: error.message || "Failed to fetch settings" };
  }
}

/**
 * Updates a setting configuration value.
 */
export async function updateSetting(key: string, value: string) {
  try {
    const sql = getSql();
    await sql`
      INSERT INTO suas_settings (key, value)
      VALUES (${key}, ${value})
      ON CONFLICT (key) DO UPDATE SET value = ${value}
    `;
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update setting:", error);
    return { success: false, error: error.message || "Failed to update setting" };
  }
}

/**
 * Fetches all administrator accounts.
 */
export async function getAdmins() {
  try {
    const sql = getSql();
    await initDatabase();
    const result = await sql`
      SELECT id, name, email, mobile, assigned_labs, role, profile_photo
      FROM suas_admins
      ORDER BY name ASC
    `;
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to get admins:", error);
    return { success: false, error: error.message || "Failed to fetch admins" };
  }
}

/**
 * Adds or updates an admin profile.
 */
export async function saveAdmin(admin: any) {
  try {
    const sql = getSql();
    const exists = await sql`SELECT id FROM suas_admins WHERE id = ${admin.id}`;
    if (exists.length > 0) {
      // Update
      if (admin.password) {
        await sql`
          UPDATE suas_admins
          SET name = ${admin.name},
              email = ${admin.email},
              mobile = ${admin.mobile},
              assigned_labs = ${admin.assigned_labs},
              role = ${admin.role},
              password = ${admin.password},
              profile_photo = ${admin.profile_photo || null}
          WHERE id = ${admin.id}
        `;
      } else {
        await sql`
          UPDATE suas_admins
          SET name = ${admin.name},
              email = ${admin.email},
              mobile = ${admin.mobile},
              assigned_labs = ${admin.assigned_labs},
              role = ${admin.role},
              profile_photo = ${admin.profile_photo || null}
          WHERE id = ${admin.id}
        `;
      }
    } else {
      // Insert
      await sql`
        INSERT INTO suas_admins (id, name, email, mobile, assigned_labs, role, password, profile_photo)
        VALUES (${admin.id}, ${admin.name}, ${admin.email}, ${admin.mobile}, ${admin.assigned_labs}, ${admin.role}, ${admin.password}, ${admin.profile_photo || null})
      `;
    }
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save admin:", error);
    return { success: false, error: error.message || "Failed to save admin profile" };
  }
}

/**
 * Removes an admin profile.
 */
export async function deleteAdmin(id: string) {
  try {
    const sql = getSql();
    await sql`DELETE FROM suas_admins WHERE id = ${id}`;
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete admin:", error);
    return { success: false, error: error.message || "Failed to delete admin" };
  }
}

/**
 * Verifies admin credentials.
 */
export async function verifyAdminLogin(id: string, password: string) {
  try {
    const sql = getSql();
    await initDatabase();
    const result = await sql`
      SELECT id, name, email, mobile, assigned_labs, role, profile_photo
      FROM suas_admins
      WHERE (LOWER(id) = LOWER(${id.trim()}) OR LOWER(email) = LOWER(${id.trim()})) AND password = ${password}
    `;
    if (result.length > 0) {
      return { success: true, data: result[0] };
    } else {
      return { success: false, error: "Invalid Admin ID or Password." };
    }
  } catch (error: any) {
    console.error("Failed to verify admin login:", error);
    return { success: false, error: error.message || "Failed to login" };
  }
}

/**
 * Faculty lookup to query the status of their software requirement requests.
 */
export async function lookupSubmissionStatus(query: string) {
  try {
    const sql = getSql();
    await initDatabase();
    const cleanQuery = query.trim().toLowerCase();
    
    const result = await sql`
      SELECT id, submission_id, faculty_name, faculty_email, semester, subjects, created_at
      FROM suas_submissions
    `;

    const filtered = result
      .map((row: any) => {
        let decryptedSubjects = [];
        try {
          const rawSubjects = typeof row.subjects === 'string' ? JSON.parse(row.subjects) : row.subjects;
          if (rawSubjects && rawSubjects.encrypted) {
            decryptedSubjects = JSON.parse(decrypt(rawSubjects.encrypted));
          } else {
            decryptedSubjects = Array.isArray(rawSubjects) ? rawSubjects : [];
          }
        } catch (e) {
          console.error("Failed to parse subjects in lookup:", e);
        }

        return {
          submissionId: row.submission_id,
          facultyName: decrypt(row.faculty_name),
          facultyEmail: decrypt(row.faculty_email),
          semester: row.semester,
          subjects: decryptedSubjects,
          createdAt: row.created_at
        };
      })
      .filter((row: any) => {
        return (
          row.submissionId.toLowerCase() === cleanQuery ||
          row.facultyEmail.toLowerCase() === cleanQuery
        );
      });

    return {
      success: true,
      data: filtered
    };
  } catch (error: any) {
    console.error("Failed to look up submission status:", error);
    return { success: false, error: error.message || "Failed to search status" };
  }
}

/* ========================================================================
   MODULAR LMS SERVER ACTIONS
   ======================================================================== */

/**
 * Inserts an event into the audit log.
 */
export async function logAuditAction(
  username: string,
  actionPerformed: string,
  tableName: string,
  recordId: string,
  previousValue: string,
  updatedValue: string
) {
  try {
    const sql = getSql();
    await sql`
      INSERT INTO suas_audit_logs (username, action_performed, table_name, record_id, previous_value, updated_value)
      VALUES (${username || "System"}, ${actionPerformed}, ${tableName}, ${recordId}, ${previousValue || ""}, ${updatedValue || ""})
    `;
    return { success: true };
  } catch (error: any) {
    console.error("Failed to write audit log:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches all audit logs.
 */
export async function getAuditLogs() {
  try {
    const sql = getSql();
    const result = await sql`
      SELECT id, username, action_performed, table_name, record_id, previous_value, updated_value, timestamp
      FROM suas_audit_logs
      ORDER BY timestamp DESC
      LIMIT 1000
    `;
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to fetch audit logs:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Clears audit logs (Director Admin only).
 */
export async function clearAuditLogs(username: string) {
  try {
    const sql = getSql();
    await sql`DELETE FROM suas_audit_logs`;
    await logAuditAction(username, "CLEAR_LOGS", "suas_audit_logs", "ALL", "All logs cleared", "");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to clear audit logs:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches department details.
 */
export async function getDepartmentDetails() {
  try {
    const sql = getSql();
    await initDatabase();
    const result = await sql`SELECT * FROM suas_department_details WHERE id = 1`;
    return { success: true, data: result[0] || null };
  } catch (error: any) {
    console.error("Failed to get department details:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates department details.
 */
export async function updateDepartmentDetails(data: any, username: string) {
  try {
    const sql = getSql();
    await initDatabase();
    
    const prevRes = await sql`SELECT * FROM suas_department_details WHERE id = 1`;
    const prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

    await sql`
      INSERT INTO suas_department_details (id, department_name, academic_year, coordinator_name, lab_coordinator_name, total_labs)
      VALUES (1, ${data.department_name}, ${data.academic_year}, ${data.coordinator_name}, ${data.lab_coordinator_name}, ${parseInt(data.total_labs) || 0})
      ON CONFLICT (id) DO UPDATE SET
        department_name = EXCLUDED.department_name,
        academic_year = EXCLUDED.academic_year,
        coordinator_name = EXCLUDED.coordinator_name,
        lab_coordinator_name = EXCLUDED.lab_coordinator_name,
        total_labs = EXCLUDED.total_labs
    `;

    const updatedVal = JSON.stringify(data);
    await logAuditAction(username, "UPDATE_DEPT", "suas_department_details", "1", prevVal, updatedVal);

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update department details:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches all laboratories.
 */
export async function getLaboratories() {
  try {
    const sql = getSql();
    await initDatabase();
    const result = await sql`
      SELECT * FROM suas_laboratories
      ORDER BY name ASC
    `;
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to fetch laboratories:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Creates or updates a laboratory record.
 */
export async function saveLaboratory(lab: any, username: string) {
  try {
    const sql = getSql();
    await initDatabase();

    let isEdit = false;
    let prevVal = "";

    if (lab.id) {
      isEdit = true;
      const prevRes = await sql`SELECT * FROM suas_laboratories WHERE id = ${lab.id}`;
      prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

      await sql`
        UPDATE suas_laboratories
        SET name = ${lab.name},
            code = ${lab.code},
            building = ${lab.building},
            floor = ${lab.floor},
            location = ${lab.location},
            seating_capacity = ${parseInt(lab.seating_capacity) || 0},
            total_computers = ${parseInt(lab.total_computers) || 0},
            operating_system = ${lab.operating_system},
            primary_purpose = ${lab.primary_purpose},
            lab_in_charge = ${lab.lab_in_charge},
            lab_assistant = ${lab.lab_assistant},
            status = ${lab.status || "Active"}
        WHERE id = ${lab.id}
      `;
      
      await logAuditAction(username, "UPDATE_LAB", "suas_laboratories", String(lab.id), prevVal, JSON.stringify(lab));
    } else {
      const result = await sql`
        INSERT INTO suas_laboratories (name, code, building, floor, location, seating_capacity, total_computers, operating_system, primary_purpose, lab_in_charge, lab_assistant, status)
        VALUES (${lab.name}, ${lab.code}, ${lab.building}, ${lab.floor}, ${lab.location}, ${parseInt(lab.seating_capacity) || 0}, ${parseInt(lab.total_computers) || 0}, ${lab.operating_system}, ${lab.primary_purpose}, ${lab.lab_in_charge}, ${lab.lab_assistant}, ${lab.status || "Active"})
        RETURNING id
      `;
      await logAuditAction(username, "CREATE_LAB", "suas_laboratories", String(result[0].id), "", JSON.stringify(lab));
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to save laboratory:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a laboratory record.
 */
export async function deleteLaboratory(id: number, username: string) {
  try {
    const sql = getSql();
    const prevRes = await sql`SELECT * FROM suas_laboratories WHERE id = ${id}`;
    const prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

    await sql`DELETE FROM suas_laboratories WHERE id = ${id}`;
    await logAuditAction(username, "DELETE_LAB", "suas_laboratories", String(id), prevVal, "");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete laboratory:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches all software installed across laboratories.
 */
export async function getLabSoftwares() {
  try {
    const sql = getSql();
    await initDatabase();
    const result = await sql`
      SELECT s.*, l.name as lab_name, l.code as lab_code 
      FROM suas_lab_softwares s
      JOIN suas_laboratories l ON s.lab_id = l.id
      ORDER BY s.software_name ASC, s.installation_date DESC
    `;
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to fetch lab softwares:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Adds or updates a software record.
 */
export async function saveLabSoftware(software: any, username: string) {
  try {
    const sql = getSql();
    await initDatabase();

    let prevVal = "";

    if (software.id) {
      const prevRes = await sql`SELECT * FROM suas_lab_softwares WHERE id = ${software.id}`;
      prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

      await sql`
        UPDATE suas_lab_softwares
        SET lab_id = ${parseInt(software.lab_id)},
            software_name = ${software.software_name},
            version = ${software.version},
            framework = ${software.framework || null},
            framework_version = ${software.framework_version || null},
            license_type = ${software.license_type},
            installation_date = ${software.installation_date},
            last_updated_date = ${software.last_updated_date || software.installation_date},
            installed_by = ${software.installed_by},
            axn_request_id = ${software.axn_request_id || null},
            remarks = ${software.remarks || null}
        WHERE id = ${software.id}
      `;
      
      await logAuditAction(username, "UPDATE_SOFTWARE", "suas_lab_softwares", String(software.id), prevVal, JSON.stringify(software));
    } else {
      const result = await sql`
        INSERT INTO suas_lab_softwares (lab_id, software_name, version, framework, framework_version, license_type, installation_date, last_updated_date, installed_by, axn_request_id, remarks)
        VALUES (${parseInt(software.lab_id)}, ${software.software_name}, ${software.version}, ${software.framework || null}, ${software.framework_version || null}, ${software.license_type}, ${software.installation_date}, ${software.last_updated_date || software.installation_date}, ${software.installed_by}, ${software.axn_request_id || null}, ${software.remarks || null})
        RETURNING id
      `;
      await logAuditAction(username, "CREATE_SOFTWARE", "suas_lab_softwares", String(result[0].id), "", JSON.stringify(software));
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to save software record:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a software record.
 */
export async function deleteLabSoftware(id: number, username: string) {
  try {
    const sql = getSql();
    const prevRes = await sql`SELECT * FROM suas_lab_softwares WHERE id = ${id}`;
    const prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

    await sql`DELETE FROM suas_lab_softwares WHERE id = ${id}`;
    await logAuditAction(username, "DELETE_SOFTWARE", "suas_lab_softwares", String(id), prevVal, "");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete software record:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches all maintenance log records.
 */
export async function getMaintenanceLogs() {
  try {
    const sql = getSql();
    await initDatabase();
    const result = await sql`
      SELECT m.*, l.name as lab_name, l.code as lab_code
      FROM suas_maintenance_log m
      JOIN suas_laboratories l ON m.lab_id = l.id
      ORDER BY m.date DESC, m.id DESC
    `;
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to fetch maintenance logs:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Saves a maintenance log record (handles auto-generation of ID).
 */
export async function saveMaintenanceLog(log: any, username: string) {
  try {
    const sql = getSql();
    await initDatabase();

    let prevVal = "";
    
    // Auto generate maintenance ID if not present
    let maintenanceId = log.maintenance_id;
    if (!maintenanceId) {
      const lastLog = await sql`
        SELECT maintenance_id FROM suas_maintenance_log
        WHERE maintenance_id LIKE 'MNT%'
        ORDER BY id DESC LIMIT 1
      `;
      let nextNum = 1;
      if (lastLog.length > 0) {
        const lastId = lastLog[0].maintenance_id;
        const match = lastId.match(/MNT(\d+)/i);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }
      maintenanceId = `MNT${String(nextNum).padStart(6, '0')}`;
    }

    if (log.id) {
      const prevRes = await sql`SELECT * FROM suas_maintenance_log WHERE id = ${log.id}`;
      prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

      await sql`
        UPDATE suas_maintenance_log
        SET lab_id = ${parseInt(log.lab_id)},
            pc_number = ${log.pc_number || null},
            system_make = ${log.system_make || null},
            system_model = ${log.system_model || null},
            serial_number = ${log.serial_number || null},
            date = ${log.date},
            time_stamp = ${log.time_stamp || null},
            issue_description = ${log.issue_description},
            reason_for_damage = ${log.reason_for_damage || null},
            action_taken = ${log.action_taken || null},
            technician_name = ${log.technician_name},
            status = ${log.status || "Pending"},
            completion_date = ${log.completion_date || null},
            remarks = ${log.remarks || null}
        WHERE id = ${log.id}
      `;
      
      await logAuditAction(username, "UPDATE_MAINTENANCE", "suas_maintenance_log", String(log.id), prevVal, JSON.stringify({ ...log, maintenance_id: maintenanceId }));
    } else {
      const result = await sql`
        INSERT INTO suas_maintenance_log 
          (maintenance_id, lab_id, pc_number, system_make, system_model, serial_number, date, time_stamp, issue_description, reason_for_damage, action_taken, technician_name, status, completion_date, remarks)
        VALUES 
          (${maintenanceId}, ${parseInt(log.lab_id)}, ${log.pc_number || null}, ${log.system_make || null}, ${log.system_model || null}, ${log.serial_number || null}, ${log.date}, ${log.time_stamp || null}, ${log.issue_description}, ${log.reason_for_damage || null}, ${log.action_taken || null}, ${log.technician_name}, ${log.status || "Pending"}, ${log.completion_date || null}, ${log.remarks || null})
        RETURNING id
      `;
      await logAuditAction(username, "CREATE_MAINTENANCE", "suas_maintenance_log", String(result[0].id), "", JSON.stringify({ ...log, maintenance_id: maintenanceId }));
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to save maintenance record:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a maintenance record.
 */
export async function deleteMaintenanceLog(id: number, username: string) {
  try {
    const sql = getSql();
    const prevRes = await sql`SELECT * FROM suas_maintenance_log WHERE id = ${id}`;
    const prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

    await sql`DELETE FROM suas_maintenance_log WHERE id = ${id}`;
    await logAuditAction(username, "DELETE_MAINTENANCE", "suas_maintenance_log", String(id), prevVal, "");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete maintenance log:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches inventory items.
 */
export async function getInventory() {
  try {
    const sql = getSql();
    await initDatabase();
    const result = await sql`
      SELECT i.*, l.name as lab_name, l.code as lab_code
      FROM suas_inventory i
      JOIN suas_laboratories l ON i.lab_id = l.id
      ORDER BY i.device_type ASC, i.asset_number ASC
    `;
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to fetch inventory:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Saves an inventory item.
 */
export async function saveInventoryItem(item: any, username: string) {
  try {
    const sql = getSql();
    await initDatabase();
    
    let prevVal = "";

    if (item.id) {
      const prevRes = await sql`SELECT * FROM suas_inventory WHERE id = ${item.id}`;
      prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

      await sql`
        UPDATE suas_inventory
        SET lab_id = ${parseInt(item.lab_id)},
            device_type = ${item.device_type},
            asset_number = ${item.asset_number},
            cpu = ${item.cpu || null},
            ram = ${item.ram || null},
            storage = ${item.storage || null},
            monitor = ${item.monitor || null},
            printer_details = ${item.printer_details || null},
            projector_details = ${item.projector_details || null},
            ups_details = ${item.ups_details || null},
            network_details = ${item.network_details || null},
            purchase_date = ${item.purchase_date},
            warranty_details = ${item.warranty_details || null},
            vendor_details = ${item.vendor_details || null},
            status = ${item.status || "Active"}
        WHERE id = ${item.id}
      `;
      
      await logAuditAction(username, "UPDATE_INVENTORY", "suas_inventory", String(item.id), prevVal, JSON.stringify(item));
    } else {
      const result = await sql`
        INSERT INTO suas_inventory (lab_id, device_type, asset_number, cpu, ram, storage, monitor, printer_details, projector_details, ups_details, network_details, purchase_date, warranty_details, vendor_details, status)
        VALUES (${parseInt(item.lab_id)}, ${item.device_type}, ${item.asset_number}, ${item.cpu || null}, ${item.ram || null}, ${item.storage || null}, ${item.monitor || null}, ${item.printer_details || null}, ${item.projector_details || null}, ${item.ups_details || null}, ${item.network_details || null}, ${item.purchase_date}, ${item.warranty_details || null}, ${item.vendor_details || null}, ${item.status || "Active"})
        RETURNING id
      `;
      await logAuditAction(username, "CREATE_INVENTORY", "suas_inventory", String(result[0].id), "", JSON.stringify(item));
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to save inventory item:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes an inventory item.
 */
export async function deleteInventoryItem(id: number, username: string) {
  try {
    const sql = getSql();
    const prevRes = await sql`SELECT * FROM suas_inventory WHERE id = ${id}`;
    const prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

    await sql`DELETE FROM suas_inventory WHERE id = ${id}`;
    await logAuditAction(username, "DELETE_INVENTORY", "suas_inventory", String(id), prevVal, "");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete inventory item:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches asset lifecycle entries.
 */
export async function getAssetLifecycle() {
  try {
    const sql = getSql();
    await initDatabase();
    const result = await sql`
      SELECT a.*, i.asset_number, i.device_type, i.warranty_details, l.name as lab_name
      FROM suas_assets_lifecycle a
      JOIN suas_inventory i ON a.inventory_id = i.id
      JOIN suas_laboratories l ON i.lab_id = l.id
      ORDER BY a.warranty_expiry ASC
    `;
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to fetch asset lifecycle records:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Saves asset lifecycle details.
 */
export async function saveAssetLifecycle(asset: any, username: string) {
  try {
    const sql = getSql();
    await initDatabase();

    let prevVal = "";

    if (asset.id) {
      const prevRes = await sql`SELECT * FROM suas_assets_lifecycle WHERE id = ${asset.id}`;
      prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

      await sql`
        UPDATE suas_assets_lifecycle
        SET inventory_id = ${parseInt(asset.inventory_id)},
            purchase_date = ${asset.purchase_date},
            warranty_expiry = ${asset.warranty_expiry},
            amc_details = ${asset.amc_details || null},
            last_maintenance = ${asset.last_maintenance || null},
            next_maintenance = ${asset.next_maintenance || null},
            current_condition = ${asset.current_condition},
            replacement_recommendation = ${asset.replacement_recommendation || null}
        WHERE id = ${asset.id}
      `;
      
      await logAuditAction(username, "UPDATE_LIFECYCLE", "suas_assets_lifecycle", String(asset.id), prevVal, JSON.stringify(asset));
    } else {
      const result = await sql`
        INSERT INTO suas_assets_lifecycle (inventory_id, purchase_date, warranty_expiry, amc_details, last_maintenance, next_maintenance, current_condition, replacement_recommendation)
        VALUES (${parseInt(asset.inventory_id)}, ${asset.purchase_date}, ${asset.warranty_expiry}, ${asset.amc_details || null}, ${asset.last_maintenance || null}, ${asset.next_maintenance || null}, ${asset.current_condition}, ${asset.replacement_recommendation || null})
        RETURNING id
      `;
      await logAuditAction(username, "CREATE_LIFECYCLE", "suas_assets_lifecycle", String(result[0].id), "", JSON.stringify(asset));
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to save asset lifecycle:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes an asset lifecycle entry.
 */
export async function deleteAssetLifecycle(id: number, username: string) {
  try {
    const sql = getSql();
    const prevRes = await sql`SELECT * FROM suas_assets_lifecycle WHERE id = ${id}`;
    const prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

    await sql`DELETE FROM suas_assets_lifecycle WHERE id = ${id}`;
    await logAuditAction(username, "DELETE_LIFECYCLE", "suas_assets_lifecycle", String(id), prevVal, "");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete asset lifecycle record:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches all NAAC records.
 */
export async function getNaacDocs() {
  try {
    const sql = getSql();
    await initDatabase();
    const result = await sql`
      SELECT n.*, l.name as lab_name
      FROM suas_naac_docs n
      LEFT JOIN suas_laboratories l ON n.lab_id = l.id
      ORDER BY n.upload_date DESC
    `;
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to fetch NAAC records:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Saves a NAAC document (Base64 file url).
 */
export async function saveNaacDoc(doc: any, username: string) {
  try {
    const sql = getSql();
    await initDatabase();

    const result = await sql`
      INSERT INTO suas_naac_docs (lab_id, document_type, document_name, file_url, uploaded_by, remarks)
      VALUES (${doc.lab_id ? parseInt(doc.lab_id) : null}, ${doc.document_type}, ${doc.document_name}, ${doc.file_url}, ${username}, ${doc.remarks || null})
      RETURNING id
    `;
    
    await logAuditAction(username, "UPLOAD_NAAC_DOC", "suas_naac_docs", String(result[0].id), "", JSON.stringify({ document_name: doc.document_name, document_type: doc.document_type }));

    return { success: true };
  } catch (error: any) {
    console.error("Failed to upload NAAC document:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a NAAC record.
 */
export async function deleteNaacDoc(id: number, username: string) {
  try {
    const sql = getSql();
    const prevRes = await sql`SELECT document_name, document_type FROM suas_naac_docs WHERE id = ${id}`;
    const prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

    await sql`DELETE FROM suas_naac_docs WHERE id = ${id}`;
    await logAuditAction(username, "DELETE_NAAC_DOC", "suas_naac_docs", String(id), prevVal, "");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete NAAC document:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches all IEEE Compliance records.
 */
export async function getIeeeCompliance() {
  try {
    const sql = getSql();
    await initDatabase();
    const result = await sql`
      SELECT c.*, l.name as lab_name
      FROM suas_ieee_compliance c
      LEFT JOIN suas_laboratories l ON c.lab_id = l.id
      ORDER BY c.last_reviewed_date DESC
    `;
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to fetch IEEE compliance records:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Saves an IEEE Compliance record.
 */
export async function saveIeeeCompliance(item: any, username: string) {
  try {
    const sql = getSql();
    await initDatabase();
    
    let prevVal = "";

    if (item.id) {
      const prevRes = await sql`SELECT * FROM suas_ieee_compliance WHERE id = ${item.id}`;
      prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

      await sql`
        UPDATE suas_ieee_compliance
        SET lab_id = ${item.lab_id ? parseInt(item.lab_id) : null},
            compliance_type = ${item.compliance_type},
            title = ${item.title},
            content_text = ${item.content_text},
            file_url = ${item.file_url || null},
            last_reviewed_date = ${item.last_reviewed_date},
            reviewed_by = ${username},
            status = ${item.status || "Draft"}
        WHERE id = ${item.id}
      `;
      
      await logAuditAction(username, "UPDATE_IEEE", "suas_ieee_compliance", String(item.id), prevVal, JSON.stringify(item));
    } else {
      const result = await sql`
        INSERT INTO suas_ieee_compliance (lab_id, compliance_type, title, content_text, file_url, last_reviewed_date, reviewed_by, status)
        VALUES (${item.lab_id ? parseInt(item.lab_id) : null}, ${item.compliance_type}, ${item.title}, ${item.content_text}, ${item.file_url || null}, ${item.last_reviewed_date}, ${username}, ${item.status || "Draft"})
        RETURNING id
      `;
      await logAuditAction(username, "CREATE_IEEE", "suas_ieee_compliance", String(result[0].id), "", JSON.stringify(item));
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to save IEEE compliance record:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes an IEEE Compliance record.
 */
export async function deleteIeeeCompliance(id: number, username: string) {
  try {
    const sql = getSql();
    const prevRes = await sql`SELECT title FROM suas_ieee_compliance WHERE id = ${id}`;
    const prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

    await sql`DELETE FROM suas_ieee_compliance WHERE id = ${id}`;
    await logAuditAction(username, "DELETE_IEEE", "suas_ieee_compliance", String(id), prevVal, "");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete IEEE compliance record:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches all Document Repository items.
 */
export async function getDocumentRepo() {
  try {
    const sql = getSql();
    await initDatabase();
    const result = await sql`
      SELECT * FROM suas_document_repository
      ORDER BY upload_date DESC
    `;
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to fetch document repository:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Uploads a document to the repository (Base64 file url).
 */
export async function saveDocument(doc: any, username: string) {
  try {
    const sql = getSql();
    await initDatabase();

    const result = await sql`
      INSERT INTO suas_document_repository (category, document_name, file_url, associated_id, uploaded_by, remarks)
      VALUES (${doc.category}, ${doc.document_name}, ${doc.file_url}, ${doc.associated_id || null}, ${username}, ${doc.remarks || null})
      RETURNING id
    `;
    
    await logAuditAction(username, "UPLOAD_DOC", "suas_document_repository", String(result[0].id), "", JSON.stringify({ document_name: doc.document_name, category: doc.category }));

    return { success: true };
  } catch (error: any) {
    console.error("Failed to save document:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a document from repository.
 */
export async function deleteDocument(id: number, username: string) {
  try {
    const sql = getSql();
    const prevRes = await sql`SELECT document_name, category FROM suas_document_repository WHERE id = ${id}`;
    const prevVal = prevRes[0] ? JSON.stringify(prevRes[0]) : "";

    await sql`DELETE FROM suas_document_repository WHERE id = ${id}`;
    await logAuditAction(username, "DELETE_DOC", "suas_document_repository", String(id), prevVal, "");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete document:", error);
    return { success: false, error: error.message };
  }
}

