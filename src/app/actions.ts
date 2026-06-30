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

    // Seed default administrators if the table is empty (exactly 6 admins)
    const adminCountResult = await sql`SELECT COUNT(*)::int as total FROM suas_admins`;
    if (adminCountResult[0]?.total === 0) {
      await sql`
        INSERT INTO suas_admins (id, name, email, mobile, assigned_labs, role, password, profile_photo)
        VALUES 
        ('admin', 'System Director', 'director@suas.ac.in', '9999999901', 'Lab A,Lab B,Lab C,Lab D,Lab E,Lab F,Lab G,Lab H,Lab I', 'Director Admin', 'Admin@SCSIT2026', NULL),
        ('it.staff1', 'IT Staff 1', 'staff1@suas.ac.in', '9999999902', 'Lab A,Lab B', 'IT Person', 'Admin@123', NULL),
        ('it.staff2', 'IT Staff 2', 'staff2@suas.ac.in', '9999999903', 'Lab C,Lab D', 'IT Person', 'Admin@123', NULL),
        ('it.staff3', 'IT Staff 3', 'staff3@suas.ac.in', '9999999904', 'Lab E,Lab F', 'IT Person', 'Admin@123', NULL),
        ('trainer1', 'Practice Trainer 1', 'trainer1@suas.ac.in', '9999999905', 'Lab G,Lab H', 'Trainer of Practice', 'Admin@123', NULL),
        ('assistant1', 'Lab Assistant 1', 'assistant1@suas.ac.in', '9999999906', 'Lab I', 'Lab Assistant', 'Admin@123', NULL);
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
      WHERE LOWER(id) = LOWER(${id.trim()}) AND password = ${password}
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
