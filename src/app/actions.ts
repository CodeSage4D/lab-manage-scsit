"use server";

import { neon, Pool } from "@neondatabase/serverless";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from "crypto";
import { headers } from "next/headers";

// Hash helper for passwords and PINs
function hashValue(val: string): string {
  if (!val) return "";
  return createHash("sha256").update(val).digest("hex");
}

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

    // Seed default administrators if the table is empty or new Super Admin / mrityunjay.sir is missing
    const adminCountResult = await sql`SELECT COUNT(*)::int as total FROM suas_admins`;
    const hasMrityunjay = await sql`SELECT COUNT(*)::int as total FROM suas_admins WHERE id = 'mrityunjay.sir'`;
    
    if (adminCountResult[0]?.total === 0 || hasMrityunjay[0]?.total === 0) {
      // Clear out legacy default users to avoid stale profiles
      await sql`DELETE FROM suas_admins WHERE id IN ('admin', 'it.staff1', 'it.staff2', 'it.staff3', 'trainer1', 'assistant1')`;
      
      await sql`
        INSERT INTO suas_admins (id, name, email, mobile, assigned_labs, role, password, profile_photo)
        VALUES 
        ('N5428', 'Karan Mishra', 'Karan.mishra@suas.ac.in', '9999999901', 'Computer Center,Basic Programming - I,Basic Programming - II,Advanced Cloud Computing,Web Technologies,Mobile Computing,Mathamatics Simulation and Sumulation,Computer Lab,IOT Lab', 'Director Admin', '@dn1m@26', NULL),
        ('monark.raikwar', 'Monark Raikwar', 'monark.raikwar@suas.ac.in', '9999999902', 'Computer Center,Basic Programming - I,Basic Programming - II,Advanced Cloud Computing,Web Technologies,Mobile Computing,Mathamatics Simulation and Sumulation,Computer Lab,IOT Lab', 'Lab Assistant', '@dn1m@26', NULL),
        ('nitin.panchal', 'Nitin Panchal', 'nitin.panchal@suas.ac.in', '9999999903', 'Advanced Cloud Computing,Web Technologies', 'Lab Assistant', '@dn1m@26', NULL),
        ('prashant.patil', 'Prashant Patil', 'prashant.patil@suas.ac.in', '9999999904', 'Basic Programming - I,Basic Programming - II', 'Lab Assistant', '@dn1m@26', NULL),
        ('salman.khan', 'Salman Khan', 'salman.khan@suas.ac.in', '9999999905', 'Computer Lab,IOT Lab', 'Trainer of Practice', '@dn1m@26', NULL),
        ('mrityunjay.sir', 'Mrityunjay Sir', 'mrityunjay@suas.ac.in', '9999999906', 'Computer Center', 'Lab Admin', '@dn1m@26', NULL)
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

    // Laboratory seeding relocated to run after column migrations.
    console.log("Migration: Relocating laboratory seeds.");

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

    // Alter Admin Table columns
    await sql`ALTER TABLE suas_admins ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255)`;
    await sql`ALTER TABLE suas_admins ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'`;
    await sql`ALTER TABLE suas_admins ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0`;
    await sql`ALTER TABLE suas_admins ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE`;

    // Alter Lab Table columns
    await sql`ALTER TABLE suas_laboratories ADD COLUMN IF NOT EXISTS series_prefix VARCHAR(50)`;
    await sql`ALTER TABLE suas_laboratories ADD COLUMN IF NOT EXISTS starting_number VARCHAR(50) DEFAULT '001'`;
    await sql`ALTER TABLE suas_laboratories ADD COLUMN IF NOT EXISTS current_number INT DEFAULT 0`;
    await sql`ALTER TABLE suas_laboratories ADD COLUMN IF NOT EXISTS max_capacity INT DEFAULT 60`;

    // Seed and/or update default laboratories exactly matching the strict requirements
    const defaultLabs = [
      { name: "Lab A", code: "LBA", series_prefix: "LBA", building: "EB", floor: "1", location: "Computer Center", seating_capacity: 60, total_computers: 60, operating_system: "Windows 11 / Ubuntu", primary_purpose: "Computer Center", lab_in_charge: "Mrityunjay Sir", lab_assistant: "Monark Sir", max_capacity: 60 },
      { name: "Lab B", code: "LBB", series_prefix: "LBB", building: "EA", floor: "1", location: "Basic Programming - I", seating_capacity: 30, total_computers: 30, operating_system: "Windows 11", primary_purpose: "Basic Programming - I", lab_in_charge: "Prashant Sir", lab_assistant: "Monark Sir", max_capacity: 30 },
      { name: "Lab C", code: "LBC", series_prefix: "LBC", building: "EB", floor: "1", location: "Basic Programming - II", seating_capacity: 30, total_computers: 30, operating_system: "Windows 11 / Ubuntu", primary_purpose: "Basic Programming - II", lab_in_charge: "Prashant Sir", lab_assistant: "Monark Sir", max_capacity: 30 },
      { name: "Lab D", code: "LBD", series_prefix: "LBD", building: "EA", floor: "5", location: "Room 505", seating_capacity: 30, total_computers: 30, operating_system: "Windows 11", primary_purpose: "Advanced Cloud Computing", lab_in_charge: "Nitin Sir", lab_assistant: "Monark Sir", max_capacity: 30 },
      { name: "Lab E", code: "LBE", series_prefix: "LBE", building: "EA", floor: "5", location: "Room 504", seating_capacity: 30, total_computers: 30, operating_system: "Windows 11 / Ubuntu", primary_purpose: "Web Technologies", lab_in_charge: "Nitin Sir", lab_assistant: "Monark Sir", max_capacity: 30 },
      { name: "Lab F", code: "LBF", series_prefix: "LBF", building: "EA", floor: "5", location: "Room 503", seating_capacity: 30, total_computers: 30, operating_system: "Windows 11", primary_purpose: "Mobile Computing", lab_in_charge: "Karan Sir", lab_assistant: "Monark Sir", max_capacity: 30 },
      { name: "Lab G", code: "LBG", series_prefix: "LBG", building: "EB", floor: "5", location: "Room 501", seating_capacity: 30, total_computers: 30, operating_system: "Windows 11", primary_purpose: "Mathamatics Simulation and Sumulation", lab_in_charge: "Karan Sir", lab_assistant: "Monark Sir", max_capacity: 30 },
      { name: "Lab H", code: "LBH", series_prefix: "LBH", building: "EB", floor: "5", location: "Room 502", seating_capacity: 30, total_computers: 30, operating_system: "Windows 11 / Ubuntu", primary_purpose: "Computer Lab", lab_in_charge: "Salman Sir", lab_assistant: "Monark Sir", max_capacity: 30 },
      { name: "Lab I", code: "LBI", series_prefix: "LBI", building: "EB", floor: "5", location: "Room 503", seating_capacity: 20, total_computers: 20, operating_system: "Windows 11 / Ubuntu", primary_purpose: "IOT Lab", lab_in_charge: "Salman Sir", lab_assistant: "Monark Sir", max_capacity: 20 }
    ];

    for (const lab of defaultLabs) {
      const existing = await sql`SELECT id FROM suas_laboratories WHERE name = ${lab.name}`;
      if (existing.length > 0) {
        await sql`
          UPDATE suas_laboratories SET 
            code = ${lab.code},
            series_prefix = ${lab.series_prefix},
            building = ${lab.building},
            floor = ${lab.floor},
            location = ${lab.location},
            seating_capacity = ${lab.seating_capacity},
            total_computers = ${lab.total_computers},
            primary_purpose = ${lab.primary_purpose},
            lab_in_charge = ${lab.lab_in_charge},
            lab_assistant = ${lab.lab_assistant},
            max_capacity = ${lab.max_capacity}
          WHERE id = ${existing[0].id}
        `;
      } else {
        await sql`
          INSERT INTO suas_laboratories (
            name, code, series_prefix, building, floor, location, 
            seating_capacity, total_computers, operating_system, 
            primary_purpose, lab_in_charge, lab_assistant, status, max_capacity
          ) VALUES (
            ${lab.name}, ${lab.code}, ${lab.series_prefix}, ${lab.building}, ${lab.floor}, ${lab.location}, 
            ${lab.seating_capacity}, ${lab.total_computers}, ${lab.operating_system}, 
            ${lab.primary_purpose}, ${lab.lab_in_charge}, ${lab.lab_assistant}, 'Active', ${lab.max_capacity}
          )
        `;
      }
    }

    // Create New Tables
    await sql`
      CREATE TABLE IF NOT EXISTS suas_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        global_asset_id VARCHAR(50) UNIQUE NOT NULL,
        lab_asset_id VARCHAR(50) UNIQUE NOT NULL,
        lab_id INT REFERENCES suas_laboratories(id) ON DELETE CASCADE,
        asset_type VARCHAR(100) NOT NULL,
        brand VARCHAR(100),
        manufacturer VARCHAR(100),
        model_number VARCHAR(100),
        serial_number VARCHAR(100),
        service_tag VARCHAR(100),
        express_service_code VARCHAR(100),
        mtm VARCHAR(100),
        product_number VARCHAR(100),
        manufacture_date DATE,
        purchase_date DATE,
        invoice_number VARCHAR(100),
        warranty_start DATE,
        warranty_end DATE,
        vendor VARCHAR(100),
        status VARCHAR(50) NOT NULL,
        parent_cpu_id UUID REFERENCES suas_assets(id) ON DELETE SET NULL,
        computer_name VARCHAR(100),
        hostname VARCHAR(100),
        ipv4 VARCHAR(45),
        ipv6 VARCHAR(45),
        mac_address VARCHAR(50),
        wifi_mac VARCHAR(50),
        lan_mac VARCHAR(50),
        gateway VARCHAR(50),
        dns VARCHAR(100),
        ip_type VARCHAR(20) DEFAULT 'DHCP',
        domain VARCHAR(100),
        workgroup VARCHAR(100),
        last_seen_date TIMESTAMP,
        network_status VARCHAR(50),
        reserved_ip BOOLEAN DEFAULT FALSE,
        processor VARCHAR(100),
        ram VARCHAR(50),
        storage VARCHAR(50),
        storage_type VARCHAR(50),
        gpu VARCHAR(100),
        motherboard VARCHAR(100),
        bios_version VARCHAR(100),
        operating_system VARCHAR(100),
        office_version VARCHAR(100),
        screen_size VARCHAR(50),
        resolution VARCHAR(50),
        barcode_data VARCHAR(255),
        qr_json TEXT,
        qr_image TEXT,
        version INT DEFAULT 1,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS suas_asset_lifecycle_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID REFERENCES suas_assets(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        details TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS suas_asset_transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID REFERENCES suas_assets(id) ON DELETE CASCADE,
        from_lab_id INT,
        to_lab_id INT,
        old_lab_asset_id VARCHAR(50),
        new_lab_asset_id VARCHAR(50),
        transferred_by VARCHAR(100),
        transferred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS suas_asset_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID REFERENCES suas_assets(id) ON DELETE CASCADE,
        image_type VARCHAR(50),
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS suas_admin_login_history (
        id SERIAL PRIMARY KEY,
        admin_id VARCHAR(50),
        event_type VARCHAR(50),
        ip_address VARCHAR(100),
        browser VARCHAR(255),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS suas_import_history (
        id SERIAL PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        imported_by VARCHAR(100) NOT NULL,
        total_rows INT NOT NULL,
        imported INT NOT NULL,
        updated INT NOT NULL,
        skipped INT NOT NULL,
        failed INT NOT NULL,
        error_report TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Alter asset table for import session ID
    await sql`ALTER TABLE suas_assets ADD COLUMN IF NOT EXISTS import_session_id VARCHAR(100)`;

    // Indexes for high performance lookup (10,000+ assets support)
    await sql`CREATE INDEX IF NOT EXISTS idx_suas_assets_global_id ON suas_assets (global_asset_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_suas_assets_lab_asset_id ON suas_assets (lab_asset_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_suas_assets_serial ON suas_assets (serial_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_suas_assets_mac ON suas_assets (mac_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_suas_assets_ipv4 ON suas_assets (ipv4)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_suas_assets_lab_id ON suas_assets (lab_id)`;

    // Seed defaults for lab series prefixes and capacity if empty
    await sql`UPDATE suas_laboratories SET series_prefix = code, max_capacity = 60 WHERE series_prefix IS NULL`;

    // Migrate plain passwords in admin database to SHA-256 hashes
    const admins = await sql`SELECT id, password FROM suas_admins`;
    for (const admin of admins) {
      if (admin.password && admin.password.length !== 64) {
        const hashed = hashValue(admin.password);
        await sql`UPDATE suas_admins SET password = ${hashed} WHERE id = ${admin.id}`;
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
 * Verifies admin credentials (Password Login).
 */
export async function verifyAdminLogin(id: string, password: string) {
  try {
    const sql = getSql();
    await initDatabase();
    
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || "Unknown Browser";
    const ip = reqHeaders.get("x-forwarded-for")?.split(',')[0].trim() || "127.0.0.1";

    const cleanId = id.trim();
    
    // Find admin account
    const admins = await sql`
      SELECT id, name, email, mobile, assigned_labs, role, password, profile_photo, pin_hash, status, failed_login_attempts, locked_until
      FROM suas_admins
      WHERE LOWER(id) = LOWER(${cleanId}) OR LOWER(email) = LOWER(${cleanId})
    `;

    if (admins.length === 0) {
      return { success: false, error: "Invalid Admin ID or Password." };
    }

    const admin = admins[0];

    // Check status
    if (admin.status === "Inactive") {
      return { success: false, error: "This admin account is inactive. Please contact the administrator." };
    }

    // Check lock out
    if (admin.locked_until) {
      const lockTime = new Date(admin.locked_until).getTime();
      const now = Date.now();
      if (lockTime > now) {
        const remainingSec = Math.ceil((lockTime - now) / 1000);
        return { 
          success: false, 
          error: `Account is temporarily locked. Try again in ${remainingSec} seconds.` 
        };
      }
    }

    const hashedInput = hashValue(password);
    if (hashedInput === admin.password) {
      // Success! Reset failed attempts
      await sql`
        UPDATE suas_admins 
        SET failed_login_attempts = 0, locked_until = NULL 
        WHERE id = ${admin.id}
      `;

      // Log to login history and audit log
      await sql`
        INSERT INTO suas_admin_login_history (admin_id, event_type, ip_address, browser)
        VALUES (${admin.id}, 'LOGIN_PASSWORD', ${ip}, ${userAgent})
      `;

      await logAuditAction(admin.name, "LOGIN_PASSWORD", "suas_admins", admin.id, "", "Hashed Password login success");

      // Strip password and pin_hash from returned data, but return if PIN is set
      const isPinSet = admin.pin_hash ? true : false;
      return {
        success: true,
        data: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          mobile: admin.mobile,
          assigned_labs: admin.assigned_labs,
          role: admin.role,
          profile_photo: admin.profile_photo,
          isPinSet
        }
      };
    } else {
      // Failed attempt
      const attempts = (admin.failed_login_attempts || 0) + 1;
      let lockUpdate = null;
      if (attempts >= 5) {
        lockUpdate = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes lockout
      }

      await sql`
        UPDATE suas_admins
        SET failed_login_attempts = ${attempts},
            locked_until = ${lockUpdate}
        WHERE id = ${admin.id}
      `;

      // Log failure
      await sql`
        INSERT INTO suas_admin_login_history (admin_id, event_type, ip_address, browser)
        VALUES (${admin.id}, 'FAILED_PASSWORD', ${ip}, ${userAgent})
      `;

      if (attempts >= 5) {
        await logAuditAction(admin.name, "LOCKOUT", "suas_admins", admin.id, "", "Account locked out for 5 minutes");
        return { success: false, error: "Account locked due to 5 failed attempts. Please try again after 5 minutes." };
      }

      return { success: false, error: `Invalid Admin ID or Password. ${5 - attempts} attempts remaining.` };
    }
  } catch (error: any) {
    console.error("Failed to verify admin login:", error);
    return { success: false, error: error.message || "Failed to login" };
  }
}

/**
 * Verifies admin credentials (PIN Login).
 */
export async function verifyAdminPINLogin(id: string, pin: string) {
  try {
    const sql = getSql();
    await initDatabase();

    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || "Unknown Browser";
    const ip = reqHeaders.get("x-forwarded-for")?.split(',')[0].trim() || "127.0.0.1";

    const cleanId = id.trim();

    // Find admin account
    const admins = await sql`
      SELECT id, name, email, mobile, assigned_labs, role, profile_photo, pin_hash, status, failed_login_attempts, locked_until
      FROM suas_admins
      WHERE LOWER(id) = LOWER(${cleanId}) OR LOWER(email) = LOWER(${cleanId})
    `;

    if (admins.length === 0) {
      return { success: false, error: "Invalid Admin ID or PIN." };
    }

    const admin = admins[0];

    // Check status
    if (admin.status === "Inactive") {
      return { success: false, error: "This admin account is inactive. Please contact the administrator." };
    }

    // Check lock out
    if (admin.locked_until) {
      const lockTime = new Date(admin.locked_until).getTime();
      const now = Date.now();
      if (lockTime > now) {
        const remainingSec = Math.ceil((lockTime - now) / 1000);
        return { 
          success: false, 
          error: `Account is temporarily locked. Try again in ${remainingSec} seconds.` 
        };
      }
    }

    // Check if PIN is configured
    if (!admin.pin_hash) {
      return { success: false, error: "PIN Quick Login is not set up yet. Please sign in with password first." };
    }

    const hashedInput = hashValue(pin);
    if (hashedInput === admin.pin_hash) {
      // Success! Reset failed attempts
      await sql`
        UPDATE suas_admins 
        SET failed_login_attempts = 0, locked_until = NULL 
        WHERE id = ${admin.id}
      `;

      // Log login history and audit log
      await sql`
        INSERT INTO suas_admin_login_history (admin_id, event_type, ip_address, browser)
        VALUES (${admin.id}, 'LOGIN_PIN', ${ip}, ${userAgent})
      `;

      await logAuditAction(admin.name, "LOGIN_PIN", "suas_admins", admin.id, "", "Quick PIN login success");

      return {
        success: true,
        data: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          mobile: admin.mobile,
          assigned_labs: admin.assigned_labs,
          role: admin.role,
          profile_photo: admin.profile_photo,
          isPinSet: true
        }
      };
    } else {
      // Failed attempt
      const attempts = (admin.failed_login_attempts || 0) + 1;
      let lockUpdate = null;
      if (attempts >= 5) {
        lockUpdate = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes lockout
      }

      await sql`
        UPDATE suas_admins
        SET failed_login_attempts = ${attempts},
            locked_until = ${lockUpdate}
        WHERE id = ${admin.id}
      `;

      // Log failure
      await sql`
        INSERT INTO suas_admin_login_history (admin_id, event_type, ip_address, browser)
        VALUES (${admin.id}, 'FAILED_PIN', ${ip}, ${userAgent})
      `;

      if (attempts >= 5) {
        await logAuditAction(admin.name, "LOCKOUT", "suas_admins", admin.id, "", "Account locked out for 5 minutes (PIN)");
        return { success: false, error: "Account locked due to 5 failed attempts. Please try again after 5 minutes." };
      }

      return { success: false, error: `Invalid PIN. ${5 - attempts} attempts remaining.` };
    }
  } catch (error: any) {
    console.error("Failed to verify PIN login:", error);
    return { success: false, error: error.message || "Failed to login" };
  }
}

/**
 * Sets up the quick login PIN after successful password authentication.
 */
export async function setupAdminPIN(id: string, passwordConfirm: string, pin: string) {
  try {
    const sql = getSql();
    await initDatabase();

    const cleanId = id.trim();
    const admins = await sql`
      SELECT id, name, password
      FROM suas_admins
      WHERE id = ${cleanId}
    `;

    if (admins.length === 0) {
      return { success: false, error: "Admin account not found." };
    }

    const admin = admins[0];
    const hashedPass = hashValue(passwordConfirm);

    if (hashedPass !== admin.password) {
      return { success: false, error: "Password verification failed. Unable to setup PIN." };
    }

    if (pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
      return { success: false, error: "PIN must be between 4 and 8 digits numeric." };
    }

    const hashedPin = hashValue(pin);
    await sql`
      UPDATE suas_admins
      SET pin_hash = ${hashedPin}
      WHERE id = ${admin.id}
    `;

    await logAuditAction(admin.name, "PIN_SETUP", "suas_admins", admin.id, "", "Quick PIN login configured successfully");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to setup admin PIN:", error);
    return { success: false, error: error.message || "Failed to setup PIN" };
  }
}

/**
 * Resets the quick login PIN (requires password verification).
 */
export async function resetAdminPIN(id: string, passwordConfirm: string, newPin: string) {
  return setupAdminPIN(id, passwordConfirm, newPin); // Reuses PIN setup validation
}

/**
 * Logs an admin logout event.
 */
export async function logAdminLogout(id: string, name: string) {
  try {
    const sql = getSql();
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || "Unknown Browser";
    const ip = reqHeaders.get("x-forwarded-for")?.split(',')[0].trim() || "127.0.0.1";

    await sql`
      INSERT INTO suas_admin_login_history (admin_id, event_type, ip_address, browser)
      VALUES (${id}, 'LOGOUT', ${ip}, ${userAgent})
    `;
    await logAuditAction(name, "LOGOUT", "suas_admins", id, "", "Session closed successfully");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to log admin logout:", error);
    return { success: false, error: error.message };
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

    // Verify duplicate lab code
    const dups = lab.id
      ? await sql`SELECT id FROM suas_laboratories WHERE LOWER(code) = LOWER(${lab.code.trim()}) AND id != ${lab.id}`
      : await sql`SELECT id FROM suas_laboratories WHERE LOWER(code) = LOWER(${lab.code.trim()})`;

    if (dups.length > 0) {
      return { success: false, error: `Duplicate Lab Code: ${lab.code} already exists.` };
    }

    const seriesPrefix = (lab.series_prefix || lab.code || "").trim().toUpperCase();
    const maxCapacity = parseInt(lab.max_capacity) || parseInt(lab.total_computers) || 60;
    const startingNumber = lab.starting_number || "001";

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
            status = ${lab.status || "Active"},
            series_prefix = ${seriesPrefix},
            starting_number = ${startingNumber},
            max_capacity = ${maxCapacity}
        WHERE id = ${lab.id}
      `;
      
      await logAuditAction(username, "UPDATE_LAB", "suas_laboratories", String(lab.id), prevVal, JSON.stringify(lab));
    } else {
      const result = await sql`
        INSERT INTO suas_laboratories (
          name, code, building, floor, location, seating_capacity, total_computers, 
          operating_system, primary_purpose, lab_in_charge, lab_assistant, status, 
          series_prefix, starting_number, current_number, max_capacity
        ) VALUES (
          ${lab.name}, ${lab.code}, ${lab.building}, ${lab.floor}, ${lab.location}, 
          ${parseInt(lab.seating_capacity) || 0}, ${parseInt(lab.total_computers) || 0}, 
          ${lab.operating_system}, ${lab.primary_purpose}, ${lab.lab_in_charge}, ${lab.lab_assistant}, 
          ${lab.status || "Active"}, ${seriesPrefix}, ${startingNumber}, 0, ${maxCapacity}
        )
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
/**
 * Fetches all IT Assets with metadata, timeline events, and attachments.
 */
export async function getAssets() {
  try {
    const sql = getSql();
    await initDatabase();
    
    // Fetch all active assets with lab name/code, parent CPU name, and mirrored inventory id
    const result = await sql`
      SELECT a.*, l.name as lab_name, l.code as lab_code, p.lab_asset_id as parent_cpu_lab_asset_id, i.id as inventory_id
      FROM suas_assets a
      LEFT JOIN suas_laboratories l ON a.lab_id = l.id
      LEFT JOIN suas_assets p ON a.parent_cpu_id = p.id
      LEFT JOIN suas_inventory i ON a.lab_asset_id = i.asset_number
      WHERE a.is_deleted = false
      ORDER BY a.global_asset_id DESC
    `;
    
    const assetsWithDetails = [];
    for (const row of result) {
      const attachments = await sql`SELECT image_type, image_url FROM suas_asset_attachments WHERE asset_id = ${row.id}`;
      const lifecycle = await sql`SELECT event_type, details, created_by, created_at FROM suas_asset_lifecycle_events WHERE asset_id = ${row.id} ORDER BY created_at DESC`;
      const transfers = await sql`SELECT from_lab_id, to_lab_id, old_lab_asset_id, new_lab_asset_id, transferred_by, transferred_at FROM suas_asset_transfers WHERE asset_id = ${row.id} ORDER BY transferred_at DESC`;
      
      assetsWithDetails.push({
        ...row,
        attachments,
        lifecycle,
        transfers
      });
    }

    return { success: true, data: assetsWithDetails };
  } catch (error: any) {
    console.error("Failed to get assets:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Validates unique constraints across active assets to prevent duplicate records.
 */
export async function checkDuplicateAssetDetails(
  id: string | null,
  serial: string,
  serviceTag: string,
  mac: string,
  ip: string,
  hostname: string,
  computerName: string,
  barcode: string
) {
  try {
    const sql = getSql();
    
    // Check Serial Number
    if (serial) {
      const dups = id 
        ? await sql`SELECT global_asset_id FROM suas_assets WHERE serial_number = ${serial} AND id != ${id}::uuid AND is_deleted = false`
        : await sql`SELECT global_asset_id FROM suas_assets WHERE serial_number = ${serial} AND is_deleted = false`;
      if (dups.length > 0) return `Duplicate Serial Number found: ${serial} already belongs to asset ${dups[0].global_asset_id}`;
    }

    // Check Service Tag
    if (serviceTag) {
      const dups = id 
        ? await sql`SELECT global_asset_id FROM suas_assets WHERE service_tag = ${serviceTag} AND id != ${id}::uuid AND is_deleted = false`
        : await sql`SELECT global_asset_id FROM suas_assets WHERE service_tag = ${serviceTag} AND is_deleted = false`;
      if (dups.length > 0) return `Duplicate Service Tag found: ${serviceTag} already belongs to asset ${dups[0].global_asset_id}`;
    }

    // Check MAC Address
    if (mac) {
      const dups = id 
        ? await sql`SELECT global_asset_id FROM suas_assets WHERE mac_address = ${mac} AND id != ${id}::uuid AND is_deleted = false`
        : await sql`SELECT global_asset_id FROM suas_assets WHERE mac_address = ${mac} AND is_deleted = false`;
      if (dups.length > 0) return `Duplicate MAC Address found: ${mac} already belongs to asset ${dups[0].global_asset_id}`;
    }

    // Check IP
    if (ip && ip !== "0.0.0.0" && ip !== "127.0.0.1") {
      const dups = id 
        ? await sql`SELECT global_asset_id FROM suas_assets WHERE ipv4 = ${ip} AND id != ${id}::uuid AND is_deleted = false`
        : await sql`SELECT global_asset_id FROM suas_assets WHERE ipv4 = ${ip} AND is_deleted = false`;
      if (dups.length > 0) return `Duplicate IP Address found: ${ip} already belongs to asset ${dups[0].global_asset_id}`;
    }

    // Check Barcode
    if (barcode) {
      const dups = id 
        ? await sql`SELECT global_asset_id FROM suas_assets WHERE barcode_data = ${barcode} AND id != ${id}::uuid AND is_deleted = false`
        : await sql`SELECT global_asset_id FROM suas_assets WHERE barcode_data = ${barcode} AND is_deleted = false`;
      if (dups.length > 0) return `Duplicate Barcode found: ${barcode} already belongs to asset ${dups[0].global_asset_id}`;
    }

    // Check Hostname
    if (hostname) {
      const dups = id 
        ? await sql`SELECT global_asset_id FROM suas_assets WHERE hostname = ${hostname} AND id != ${id}::uuid AND is_deleted = false`
        : await sql`SELECT global_asset_id FROM suas_assets WHERE hostname = ${hostname} AND is_deleted = false`;
      if (dups.length > 0) return `Duplicate Hostname found: ${hostname} already belongs to asset ${dups[0].global_asset_id}`;
    }

    // Check Computer Name
    if (computerName) {
      const dups = id 
        ? await sql`SELECT global_asset_id FROM suas_assets WHERE computer_name = ${computerName} AND id != ${id}::uuid AND is_deleted = false`
        : await sql`SELECT global_asset_id FROM suas_assets WHERE computer_name = ${computerName} AND is_deleted = false`;
      if (dups.length > 0) return `Duplicate Computer Name found: ${computerName} already belongs to asset ${dups[0].global_asset_id}`;
    }

    return null;
  } catch (err: any) {
    console.error("Duplicate validation error:", err);
    return null;
  }
}

/**
 * Saves (Creates/Updates) an IT Asset record.
 * Handles dual-ID generation, capacity configuration limits, and duplicate validations.
 */
export async function saveAsset(asset: any, username: string) {
  try {
    const sql = getSql();
    await initDatabase();

    const isEdit = asset.id ? true : false;
    
    // Clean inputs
    const labId = parseInt(asset.lab_id);
    const assetType = asset.asset_type || asset.device_type || "CPU";
    const brand = (asset.brand || "").trim();
    const manufacturer = (asset.manufacturer || "").trim();
    const modelNumber = (asset.model_number || "").trim();
    const serialNumber = (asset.serial_number || "").trim();
    const serviceTag = (asset.service_tag || "").trim();
    const expressServiceCode = (asset.express_service_code || "").trim();
    const mtm = (asset.mtm || "").trim();
    const productNumber = (asset.product_number || "").trim();
    const manufactureDate = asset.manufacture_date || null;
    const purchaseDate = asset.purchase_date || null;
    const invoiceNumber = (asset.invoice_number || "").trim();
    const warrantyStart = asset.warranty_start || null;
    const warrantyEnd = asset.warranty_end || null;
    const vendor = (asset.vendor || "").trim();
    const status = asset.status || "Installed";
    const parentCpuId = asset.parent_cpu_id || null;

    // Network Details
    const computerName = (asset.computer_name || "").trim();
    const hostname = (asset.hostname || "").trim();
    const ipv4 = (asset.ipv4 || "").trim();
    const ipv6 = (asset.ipv6 || "").trim();
    const macAddress = (asset.mac_address || "").trim().toUpperCase();
    const wifiMac = (asset.wifi_mac || "").trim().toUpperCase();
    const lanMac = (asset.lan_mac || "").trim().toUpperCase();
    const gateway = (asset.gateway || "").trim();
    const dns = (asset.dns || "").trim();
    const ipType = asset.ip_type || "DHCP";
    const domain = (asset.domain || "").trim();
    const workgroup = (asset.workgroup || "").trim();
    const lastSeenDate = asset.last_seen_date || null;
    const networkStatus = asset.network_status || "Offline";
    const reservedIp = asset.reserved_ip === true || asset.reserved_ip === 'true';

    // Hardware Details
    const processor = (asset.processor || "").trim();
    const ram = (asset.ram || "").trim();
    const storage = (asset.storage || "").trim();
    const storageType = asset.storage_type || "SSD";
    const gpu = (asset.gpu || "").trim();
    const motherboard = (asset.motherboard || "").trim();
    const biosVersion = (asset.bios_version || "").trim();
    const operatingSystem = (asset.operating_system || "").trim();
    const officeVersion = (asset.office_version || "").trim();

    // Display specifications
    const screenSize = (asset.screen_size || "").trim();
    const resolution = (asset.resolution || "").trim();
    const barcodeData = (asset.barcode_data || "").trim();

    // Attachments
    const newAttachments = asset.attachments || []; // Array of { image_type, image_url }

    // Pre-save duplicate check
    const duplicateError = await checkDuplicateAssetDetails(
      isEdit ? asset.id : null,
      serialNumber,
      serviceTag,
      macAddress,
      ipv4,
      hostname,
      computerName,
      barcodeData
    );

    if (duplicateError) {
      return { success: false, error: duplicateError };
    }

    if (!isEdit) {
      // 1. Fetch Lab configuration
      const labs = await sql`
        SELECT id, name, code, series_prefix, starting_number, current_number, max_capacity
        FROM suas_laboratories
        WHERE id = ${labId}
      `;

      if (labs.length === 0) {
        return { success: false, error: "Target laboratory not found." };
      }

      const lab = labs[0];
      const maxCap = lab.max_capacity || 60;
      const currentNum = lab.current_number || 0;

      // 2. Capacity validation check
      if (currentNum >= maxCap) {
        return { success: false, error: "Maximum Lab Capacity Reached." };
      }

      // 3. Generate IDs
      const nextNum = currentNum + 1;
      const seriesPrefix = lab.series_prefix || lab.code || "AST";
      const labAssetId = `${seriesPrefix}-${String(nextNum).padStart(3, '0')}`;

      // Global Asset ID: AST-{YEAR}-{8 digit running number}
      const year = new Date().getFullYear();
      const countRes = await sql`SELECT COUNT(*)::int as total FROM suas_assets`;
      const runningNum = String(countRes[0].total + 1).padStart(8, '0');
      const globalAssetId = `AST-${year}-${runningNum}`;

      // QR Code Content JSON structured format
      const qrContent = {
        AssetID: globalAssetId,
        LabAssetID: labAssetId,
        Lab: lab.name,
        AssetType: assetType,
        Brand: brand,
        Model: modelNumber,
        Serial: serialNumber,
        ServiceTag: serviceTag,
        Status: status
      };
      const qrJson = JSON.stringify(qrContent);
      const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrJson)}`;

      // 4. Save inside database
      const insertRes = await sql`
        INSERT INTO suas_assets (
          global_asset_id, lab_asset_id, lab_id, asset_type, brand, manufacturer, model_number, 
          serial_number, service_tag, express_service_code, mtm, product_number, manufacture_date, 
          purchase_date, invoice_number, warranty_start, warranty_end, vendor, status, parent_cpu_id, 
          computer_name, hostname, ipv4, ipv6, mac_address, wifi_mac, lan_mac, gateway, dns, ip_type, 
          domain, workgroup, last_seen_date, network_status, reserved_ip, processor, ram, storage, 
          storage_type, gpu, motherboard, bios_version, operating_system, office_version, screen_size, 
          resolution, barcode_data, qr_json, qr_image
        ) VALUES (
          ${globalAssetId}, ${labAssetId}, ${labId}, ${assetType}, ${brand}, ${manufacturer}, ${modelNumber}, 
          ${serialNumber}, ${serviceTag}, ${expressServiceCode}, ${mtm}, ${productNumber}, ${manufactureDate}, 
          ${purchaseDate}, ${invoiceNumber}, ${warrantyStart}, ${warrantyEnd}, ${vendor}, ${status}, ${parentCpuId}, 
          ${computerName}, ${hostname}, ${ipv4}, ${ipv6}, ${macAddress}, ${wifiMac}, ${lanMac}, ${gateway}, ${dns}, ${ipType}, 
          ${domain}, ${workgroup}, ${lastSeenDate}, ${networkStatus}, ${reservedIp}, ${processor}, ${ram}, ${storage}, 
          ${storageType}, ${gpu}, ${motherboard}, ${biosVersion}, ${operatingSystem}, ${officeVersion}, ${screenSize}, 
          ${resolution}, ${barcodeData}, ${qrJson}, ${qrImage}
        )
        RETURNING id
      `;

      const newAssetId = insertRes[0].id;

      // Mirror insert into suas_inventory for backward compatibility
      await sql`
        INSERT INTO suas_inventory (lab_id, device_type, asset_number, cpu, ram, storage, monitor, purchase_date, status)
        VALUES (${labId}, ${assetType}, ${labAssetId}, ${processor}, ${ram}, ${storage}, ${screenSize}, ${purchaseDate || new Date().toISOString().split('T')[0]}, ${status})
      `;

      // 5. Update Lab counter
      await sql`
        UPDATE suas_laboratories
        SET current_number = ${nextNum}
        WHERE id = ${labId}
      `;

      // 6. Write to lifecycle timeline event (Purchased / Received / Installed)
      await sql`
        INSERT INTO suas_asset_lifecycle_events (asset_id, event_type, details, created_by)
        VALUES (${newAssetId}, ${status}, 'Asset registered and deployed in ' || ${lab.name}, ${username})
      `;

      // 7. Write to attachments
      for (const attachment of newAttachments) {
        if (attachment.image_url) {
          await sql`
            INSERT INTO suas_asset_attachments (asset_id, image_type, image_url)
            VALUES (${newAssetId}, ${attachment.image_type}, ${attachment.image_url})
          `;
        }
      }

      await logAuditAction(username, "CREATE_ASSET", "suas_assets", globalAssetId, "", JSON.stringify(qrContent));

      return { success: true, id: newAssetId, globalAssetId, labAssetId };

    } else {
      // 1. Fetch current record for version check
      const currentAssets = await sql`
        SELECT id, global_asset_id, lab_asset_id, lab_id, status, version
        FROM suas_assets
        WHERE id = ${asset.id}::uuid AND is_deleted = false
      `;

      if (currentAssets.length === 0) {
        return { success: false, error: "Asset record not found." };
      }

      const currentAsset = currentAssets[0];

      // Optimistic locking
      if (asset.version !== undefined && parseInt(asset.version) !== currentAsset.version) {
        return { success: false, error: "Concurrency Conflict: This record has been modified by another admin. Please refresh." };
      }

      const prevLabId = currentAsset.lab_id;
      let finalLabAssetId = currentAsset.lab_asset_id;
      let finalLabId = prevLabId;

      // Check if transferred to a different laboratory!
      if (prevLabId !== labId) {
        const labs = await sql`
          SELECT id, name, code, series_prefix, starting_number, current_number, max_capacity
          FROM suas_laboratories
          WHERE id = ${labId}
        `;

        if (labs.length === 0) {
          return { success: false, error: "Target transfer laboratory not found." };
        }

        const lab = labs[0];
        const maxCap = lab.max_capacity || 60;
        const currentNum = lab.current_number || 0;

        if (currentNum >= maxCap) {
          return { success: false, error: `Transfer failed: Target laboratory ${lab.name} capacity reached.` };
        }

        const nextNum = currentNum + 1;
        const seriesPrefix = lab.series_prefix || lab.code || "AST";
        finalLabAssetId = `${seriesPrefix}-${String(nextNum).padStart(3, '0')}`;
        finalLabId = labId;

        // Log transfer history
        await sql`
          INSERT INTO suas_asset_transfers (asset_id, from_lab_id, to_lab_id, old_lab_asset_id, new_lab_asset_id, transferred_by)
          VALUES (${asset.id}::uuid, ${prevLabId}, ${labId}, ${currentAsset.lab_asset_id}, ${finalLabAssetId}, ${username})
        `;

        // Update target lab count
        await sql`
          UPDATE suas_laboratories
          SET current_number = ${nextNum}
          WHERE id = ${labId}
        `;

        // Add transfer event to timeline
        await sql`
          INSERT INTO suas_asset_lifecycle_events (asset_id, event_type, details, created_by)
          VALUES (${asset.id}::uuid, 'Transfer', 'Transferred from Lab ID ' || ${prevLabId} || ' to ' || ${lab.name} || '. New ID: ' || ${finalLabAssetId}, ${username})
        `;
      }

      // Update status event if changed
      if (currentAsset.status !== status) {
        await sql`
          INSERT INTO suas_asset_lifecycle_events (asset_id, event_type, details, created_by)
          VALUES (${asset.id}::uuid, ${status}, 'Status updated to: ' || ${status}, ${username})
        `;
      }

      const nextVersion = currentAsset.version + 1;

      // Update values
      await sql`
        UPDATE suas_assets
        SET lab_id = ${finalLabId},
            lab_asset_id = ${finalLabAssetId},
            asset_type = ${assetType},
            brand = ${brand},
            manufacturer = ${manufacturer},
            model_number = ${modelNumber},
            serial_number = ${serialNumber},
            service_tag = ${serviceTag},
            express_service_code = ${expressServiceCode},
            mtm = ${mtm},
            product_number = ${productNumber},
            manufacture_date = ${manufactureDate},
            purchase_date = ${purchaseDate},
            invoice_number = ${invoiceNumber},
            warranty_start = ${warrantyStart},
            warranty_end = ${warrantyEnd},
            vendor = ${vendor},
            status = ${status},
            parent_cpu_id = ${parentCpuId ? parentCpuId : null},
            computer_name = ${computerName},
            hostname = ${hostname},
            ipv4 = ${ipv4},
            ipv6 = ${ipv6},
            mac_address = ${macAddress},
            wifi_mac = ${wifiMac},
            lan_mac = ${lanMac},
            gateway = ${gateway},
            dns = ${dns},
            ip_type = ${ipType},
            domain = ${domain},
            workgroup = ${workgroup},
            last_seen_date = ${lastSeenDate},
            network_status = ${networkStatus},
            reserved_ip = ${reservedIp},
            processor = ${processor},
            ram = ${ram},
            storage = ${storage},
            storage_type = ${storageType},
            gpu = ${gpu},
            motherboard = ${motherboard},
            bios_version = ${biosVersion},
            operating_system = ${operatingSystem},
            office_version = ${officeVersion},
            screen_size = ${screenSize},
            resolution = ${resolution},
            barcode_data = ${barcodeData},
            version = ${nextVersion}
        WHERE id = ${asset.id}::uuid
      `;

      // Update mirrored inventory item for backward compatibility
      await sql`
        UPDATE suas_inventory
        SET lab_id = ${finalLabId},
            device_type = ${assetType},
            asset_number = ${finalLabAssetId},
            cpu = ${processor},
            ram = ${ram},
            storage = ${storage},
            monitor = ${screenSize},
            purchase_date = ${purchaseDate || new Date().toISOString().split('T')[0]},
            status = ${status}
        WHERE asset_number = ${currentAsset.lab_asset_id}
      `;

      // Save attachments
      await sql`DELETE FROM suas_asset_attachments WHERE asset_id = ${asset.id}::uuid`;
      for (const attachment of newAttachments) {
        if (attachment.image_url) {
          await sql`
            INSERT INTO suas_asset_attachments (asset_id, image_type, image_url)
            VALUES (${asset.id}::uuid, ${attachment.image_type}, ${attachment.image_url})
          `;
        }
      }

      await logAuditAction(username, "UPDATE_ASSET", "suas_assets", currentAsset.global_asset_id, JSON.stringify(currentAsset), JSON.stringify(asset));

      return { success: true, id: asset.id, globalAssetId: currentAsset.global_asset_id, labAssetId: finalLabAssetId };
    }
  } catch (error: any) {
    console.error("Failed to save asset:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Soft deletes an asset record (never permanently deletes).
 */
export async function deleteAsset(id: string, username: string) {
  try {
    const sql = getSql();
    const assets = await sql`SELECT global_asset_id, lab_asset_id FROM suas_assets WHERE id = ${id}::uuid`;
    if (assets.length === 0) return { success: false, error: "Asset not found." };
    
    const globalId = assets[0].global_asset_id;
    const labAssetId = assets[0].lab_asset_id;

    // Soft delete
    await sql`UPDATE suas_assets SET is_deleted = true WHERE id = ${id}::uuid`;

    // Mirror delete from suas_inventory
    await sql`DELETE FROM suas_inventory WHERE asset_number = ${labAssetId}`;

    // Log lifecycle event 'Disposed'
    await sql`
      INSERT INTO suas_asset_lifecycle_events (asset_id, event_type, details, created_by)
      VALUES (${id}::uuid, 'Disposed', 'Asset soft deleted/disposed by ' || ${username}, ${username})
    `;

    await logAuditAction(username, "DELETE_ASSET", "suas_assets", globalId, "", "Asset soft deleted");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete asset:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Bridges getInventory calls to getAssets for backward compatibility.
 */
export async function getInventory() {
  const res = await getAssets();
  if (res.success && res.data) {
    const mapped = res.data.map((item: any) => ({
      id: item.inventory_id || 0,
      lab_id: item.lab_id,
      device_type: item.asset_type,
      asset_number: item.lab_asset_id,
      cpu: item.processor,
      ram: item.ram,
      storage: item.storage,
      monitor: item.screen_size || "",
      printer_details: item.asset_type === "Printer" ? `${item.brand || ""} ${item.model_number || ""}` : "",
      projector_details: item.asset_type === "Projector" ? `${item.brand || ""} ${item.model_number || ""}` : "",
      ups_details: item.asset_type === "UPS" ? `${item.brand || ""} ${item.model_number || ""}` : "",
      network_details: item.asset_type === "Network Device" ? `${item.brand || ""} ${item.model_number || ""}` : "",
      purchase_date: item.purchase_date ? new Date(item.purchase_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      warranty_details: item.warranty_end ? `Warranty until ${new Date(item.warranty_end).toISOString().split('T')[0]}` : "",
      vendor_details: item.vendor || "",
      status: item.status,
      lab_name: item.lab_name,
      lab_code: item.lab_code,
      
      // Extended properties
      uuid: item.id,
      global_asset_id: item.global_asset_id,
      display_name: `${item.lab_name} - ${item.lab_asset_id}`,
      brand: item.brand,
      model_number: item.model_number,
      serial_number: item.serial_number,
      service_tag: item.service_tag,
      mac_address: item.mac_address,
      ipv4: item.ipv4,
      hostname: item.hostname,
      computer_name: item.computer_name,
      parent_cpu_id: item.parent_cpu_id,
      attachments: item.attachments,
      lifecycle: item.lifecycle,
      transfers: item.transfers,
      version: item.version
    }));
    return { success: true, data: mapped };
  }
  return res;
}

/**
 * Bridges saveInventoryItem calls to saveAsset for backward compatibility.
 */
export async function saveInventoryItem(item: any, username: string) {
  try {
    const sql = getSql();
    let assetId = null;

    if (item.id) {
      // Find matching UUID from suas_assets by looking up the mirrored inventory
      const found = await sql`
        SELECT a.id FROM suas_assets a
        JOIN suas_inventory i ON a.lab_asset_id = i.asset_number
        WHERE i.id = ${parseInt(item.id)} AND a.is_deleted = false
      `;
      if (found.length > 0) {
        assetId = found[0].id;
      }
    }

    const mappedAsset = {
      id: assetId,
      lab_id: item.lab_id,
      asset_type: item.device_type,
      brand: item.brand || "",
      model_number: item.model_number || "",
      serial_number: item.serial_number || "",
      service_tag: item.service_tag || "",
      purchase_date: item.purchase_date,
      status: item.status,
      processor: item.cpu || "",
      ram: item.ram || "",
      storage: item.storage || "",
      screen_size: item.monitor || "",
      vendor: item.vendor_details || "",
      warranty_end: item.warranty_details ? new Date(item.warranty_details).toISOString().split('T')[0] : null
    };

    return await saveAsset(mappedAsset, username);
  } catch (error: any) {
    console.error("Failed in bridge saveInventoryItem:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Bridges deleteInventoryItem calls to deleteAsset for backward compatibility.
 */
export async function deleteInventoryItem(id: number, username: string) {
  try {
    const sql = getSql();
    const found = await sql`
      SELECT a.id FROM suas_assets a
      JOIN suas_inventory i ON a.lab_asset_id = i.asset_number
      WHERE i.id = ${id} AND a.is_deleted = false
    `;
    if (found.length === 0) {
      return { success: false, error: "Asset not found in directory." };
    }
    return await deleteAsset(found[0].id, username);
  } catch (error: any) {
    console.error("Failed in bridge deleteInventoryItem:", error);
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

/**
 * Perform batch transactional asset imports with complete rollback protection.
 */
export async function importAssetsBulk(
  records: any[],
  options: {
    importNewOnly: boolean;
    updateExisting: boolean;
    skipDuplicates: boolean;
    generateQr: boolean;
    generateLabId: boolean;
    generateGlobalId: boolean;
    validateOnly: boolean;
  },
  fileName: string,
  username: string
) {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: "DATABASE_URL is not set in environment variables." };
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const failedRows: any[] = [];

  try {
    await client.query("BEGIN");

    // Fetch all laboratories first to map names to IDs
    const labsRes = await client.query("SELECT id, name, code, series_prefix, current_number, max_capacity FROM suas_laboratories");
    const labsList = labsRes.rows;

    for (let index = 0; index < records.length; index++) {
      const row = records[index];
      const rowNum = row.__rowNum__ || (index + 2); // Excel row offset
      
      // Trim & Normalize strings
      const trimStr = (v: any) => v && typeof v === "string" ? v.trim() : (v !== undefined && v !== null ? String(v).trim() : "");
      const labNameInput = trimStr(row.lab_name);
      const assetType = trimStr(row.asset_type);
      const brand = trimStr(row.brand);
      const modelNumber = trimStr(row.model_number);
      const serialNumber = trimStr(row.serial_number);
      const serviceTag = trimStr(row.service_tag);
      const macAddress = trimStr(row.mac_address);
      const ipv4 = trimStr(row.ipv4);
      const computerName = trimStr(row.computer_name);
      const hostname = trimStr(row.hostname);
      const processor = trimStr(row.processor);
      const ram = trimStr(row.ram);
      const storage = trimStr(row.storage);
      const storageType = trimStr(row.storage_type);
      const operating_system = trimStr(row.operating_system);
      const purchase_date = trimStr(row.purchase_date);
      const warranty_end = trimStr(row.warranty_end);
      const status = trimStr(row.status) || "Working";

      // 1. Find Lab by name or code
      const lab = labsList.find(l => 
        l.name.toLowerCase() === labNameInput.toLowerCase() || 
        l.code.toLowerCase() === labNameInput.toLowerCase()
      );

      if (!labNameInput) {
        failedCount++;
        failedRows.push({ row: rowNum, error: "Missing Laboratory field." });
        continue;
      }

      if (!lab) {
        failedCount++;
        failedRows.push({ row: rowNum, error: `Laboratory '${labNameInput}' not found in system.` });
        continue;
      }

      if (!assetType) {
        failedCount++;
        failedRows.push({ row: rowNum, error: "Missing Asset Type field." });
        continue;
      }

      // 2. Check duplicates inside DB
      let existingAsset: any = null;
      if (serialNumber) {
        const dupRes = await client.query("SELECT * FROM suas_assets WHERE serial_number = $1 AND is_deleted = false LIMIT 1", [serialNumber]);
        if (dupRes.rows.length > 0) existingAsset = dupRes.rows[0];
      }
      if (!existingAsset && serviceTag) {
        const dupRes = await client.query("SELECT * FROM suas_assets WHERE service_tag = $1 AND is_deleted = false LIMIT 1", [serviceTag]);
        if (dupRes.rows.length > 0) existingAsset = dupRes.rows[0];
      }
      if (!existingAsset && macAddress) {
        const dupRes = await client.query("SELECT * FROM suas_assets WHERE mac_address = $1 AND is_deleted = false LIMIT 1", [macAddress]);
        if (dupRes.rows.length > 0) existingAsset = dupRes.rows[0];
      }
      if (!existingAsset && ipv4 && ipv4.toLowerCase() !== "dhcp") {
        const dupRes = await client.query("SELECT * FROM suas_assets WHERE ipv4 = $1 AND is_deleted = false LIMIT 1", [ipv4]);
        if (dupRes.rows.length > 0) existingAsset = dupRes.rows[0];
      }
      if (!existingAsset && computerName) {
        const dupRes = await client.query("SELECT * FROM suas_assets WHERE computer_name = $1 AND is_deleted = false LIMIT 1", [computerName]);
        if (dupRes.rows.length > 0) existingAsset = dupRes.rows[0];
      }

      // 3. Handle duplicates
      if (existingAsset) {
        if (options.skipDuplicates) {
          skippedCount++;
          continue;
        } else if (options.updateExisting) {
          // Perform update query
          const purchaseDateVal = purchase_date ? new Date(purchase_date) : (existingAsset.purchase_date || null);
          const warrantyEndVal = warranty_end ? new Date(warranty_end) : (existingAsset.warranty_end || null);
          
          await client.query(`
            UPDATE suas_assets SET
              brand = $1, model_number = $2, serial_number = $3, service_tag = $4,
              mac_address = $5, ipv4 = $6, computer_name = $7, hostname = $8,
              processor = $9, ram = $10, storage = $11, storage_type = $12,
              operating_system = $13, purchase_date = $14, warranty_end = $15,
              status = $16, version = version + 1
            WHERE id = $17
          `, [
            brand || existingAsset.brand, modelNumber || existingAsset.model_number,
            serialNumber || existingAsset.serial_number, serviceTag || existingAsset.service_tag,
            macAddress || existingAsset.mac_address, ipv4 || existingAsset.ipv4,
            computerName || existingAsset.computer_name, hostname || existingAsset.hostname,
            processor || existingAsset.processor, ram || existingAsset.ram,
            storage || existingAsset.storage, storageType || existingAsset.storage_type,
            operating_system || existingAsset.operating_system, purchaseDateVal, warrantyEndVal,
            status, existingAsset.id
          ]);

          // Log lifecycle
          await client.query(`
            INSERT INTO suas_asset_lifecycle_events (asset_id, event_type, details, created_by)
            VALUES ($1, 'Import Update', 'Details updated via Excel Import session.', $2)
          `, [existingAsset.id, username]);

          updatedCount++;
          continue;
        } else {
          // Reject row
          failedCount++;
          failedRows.push({ row: rowNum, error: `Duplicate asset found with matching unique key.` });
          continue;
        }
      }

      if (options.importNewOnly || (!options.importNewOnly && !options.updateExisting && !options.skipDuplicates)) {
        // 4. Generate missing identifiers
        let labAssetId = trimStr(row.lab_asset_id);
        if (!labAssetId) {
          // Increment lab count
          const labCountRes = await client.query("SELECT COUNT(*)::int as total FROM suas_assets WHERE lab_id = $1 AND is_deleted = false", [lab.id]);
          const currentCount = labCountRes.rows[0].total;
          if (currentCount >= lab.max_capacity) {
            failedCount++;
            failedRows.push({ row: rowNum, error: `Maximum seating capacity of ${lab.max_capacity} reached in ${lab.name}.` });
            continue;
          }
          const nextSeq = currentCount + 1;
          const prefix = lab.series_prefix || lab.code || "LBA";
          labAssetId = `${prefix}-${String(nextSeq).padStart(3, '0')}`;
        }

        // Validate generated/provided lab asset ID duplicate
        const labDupRes = await client.query("SELECT id FROM suas_assets WHERE lab_asset_id = $1 AND is_deleted = false", [labAssetId]);
        if (labDupRes.rows.length > 0) {
          failedCount++;
          failedRows.push({ row: rowNum, error: `Lab Asset ID ${labAssetId} already exists.` });
          continue;
        }

        let globalAssetId = trimStr(row.global_asset_id);
        if (!globalAssetId) {
          const totalAssetsRes = await client.query("SELECT count(*)::int as total FROM suas_assets");
          const totalAssetsCount = totalAssetsRes.rows[0].total + importedCount + 1;
          const year = new Date().getFullYear();
          globalAssetId = `AST-${year}-${String(totalAssetsCount).padStart(8, '0')}`;
        }

        // Validate global asset ID duplicate
        const globDupRes = await client.query("SELECT id FROM suas_assets WHERE global_asset_id = $1", [globalAssetId]);
        if (globDupRes.rows.length > 0) {
          failedCount++;
          failedRows.push({ row: rowNum, error: `Global Asset ID ${globalAssetId} already exists.` });
          continue;
        }

        // 5. Generate QR Code JSON
        const qrContent = {
          AssetID: globalAssetId,
          LabAssetID: labAssetId,
          Lab: lab.name,
          AssetType: assetType,
          Brand: brand,
          Model: modelNumber,
          Serial: serialNumber,
          Status: status
        };
        const qrJson = JSON.stringify(qrContent);
        const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrJson)}`;

        const purchaseDateVal = purchase_date ? new Date(purchase_date) : null;
        const warrantyEndVal = warranty_end ? new Date(warranty_end) : null;

        // 6. Insert into database
        const insertRes = await client.query(`
          INSERT INTO suas_assets (
            global_asset_id, lab_asset_id, lab_id, asset_type, brand, model_number, 
            serial_number, service_tag, mac_address, ipv4, computer_name, hostname, 
            processor, ram, storage, storage_type, operating_system, purchase_date, 
            warranty_end, status, qr_json, qr_image, is_deleted
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, false)
          RETURNING id
        `, [
          globalAssetId, labAssetId, lab.id, assetType, brand, modelNumber,
          serialNumber, serviceTag, macAddress, ipv4, computerName, hostname,
          processor, ram, storage, storageType, operating_system, purchaseDateVal,
          warrantyEndVal, status, qrJson, qrImage
        ]);

        const newAssetId = insertRes.rows[0].id;

        // Create log lifecycle
        await client.query(`
          INSERT INTO suas_asset_lifecycle_events (asset_id, event_type, details, created_by)
          VALUES ($1, 'Import Create', 'Asset created via Excel Import session.', $2)
        `, [newAssetId, username]);

        // Mirror insert into suas_inventory for backward compatibility
        await client.query(`
          INSERT INTO suas_inventory (
            lab_id, device_type, asset_number, cpu, ram, storage, monitor, printer_details,
            projector_details, ups_details, network_details, purchase_date, warranty_details,
            vendor_details, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, '', '', '', '', $8, $9, '', $10)
          ON CONFLICT (asset_number) DO UPDATE SET
            status = EXCLUDED.status, cpu = EXCLUDED.cpu, ram = EXCLUDED.ram, storage = EXCLUDED.storage
        `, [
          lab.id, assetType, labAssetId, processor, ram, storage, "",
          purchaseDateVal || new Date(), warranty_end ? `Warranty until ${warranty_end}` : "", status
        ]);

        importedCount++;
      }
    }

    // Check if we should commit or if validation-only
    if (failedRows.length > 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: `Import failed: ${failedRows.length} rows have validation errors. The entire operation has been rolled back.`,
        summary: {
          total: records.length,
          imported: 0,
          updated: 0,
          skipped: 0,
          failed: failedRows.length,
          errors: failedRows
        }
      };
    }

    if (options.validateOnly) {
      await client.query("ROLLBACK");
      return {
        success: true,
        message: "Data validation completed successfully. Zero errors found.",
        summary: {
          total: records.length,
          imported: importedCount,
          updated: updatedCount,
          skipped: skippedCount,
          failed: 0,
          errors: []
        }
      };
    }

    // Commit transaction
    await client.query("COMMIT");

    // Write to import history logs
    await client.query(`
      INSERT INTO suas_import_history (file_name, imported_by, total_rows, imported, updated, skipped, failed, error_report)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      fileName, username, records.length, importedCount, updatedCount, skippedCount, failedCount,
      failedRows.length > 0 ? JSON.stringify(failedRows) : null
    ]);

    return {
      success: true,
      message: `Successfully imported ${importedCount} and updated ${updatedCount} records from Excel.`,
      summary: {
        total: records.length,
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: failedCount,
        errors: failedRows
      }
    };

  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Bulk import failed, transaction rolled back:", error);
    return {
      success: false,
      error: `Database transaction error: ${error.message || error}. The entire operation has been safely rolled back.`,
      summary: {
        total: records.length,
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: records.length,
        errors: [{ row: "All", error: error.message || String(error) }]
      }
    };
  } finally {
    client.release();
  }
}

/**
 * Fetches all previous import wizard execution logs.
 */
export async function getImportLogs() {
  try {
    const sql = getSql();
    await initDatabase();
    const result = await sql`
      SELECT * FROM suas_import_history
      ORDER BY created_at DESC
    `;
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to fetch import logs:", error);
    return { success: false, error: error.message };
  }
}

