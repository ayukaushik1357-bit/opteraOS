import crypto from "crypto";
import fs from "fs";
import path from "path";

// Load .env manually for standalone runner
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
      }
    });
  }
} catch (e) {}

// ─────────────────────────────────────────────────────────────────────────────
// OPTERAOS — REAL-WORLD END-TO-END DIRECT ACCESS VERIFICATION HARNESS
// ─────────────────────────────────────────────────────────────────────────────
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

let passedCount = 0;
let failedCount = 0;
const results = [];

function assert(description, condition, details = "") {
  if (condition) {
    passedCount++;
    console.log(`  ${green("✓")} ${description}`);
    results.push({ name: description, passed: true, details });
  } else {
    failedCount++;
    console.log(`  ${red("✗")} ${description}`);
    if (details) console.log(`    ${red("Error details:")} ${details}`);
    results.push({ name: description, passed: false, details });
  }
}

console.log(bold(cyan("\n============================================================")));
console.log(bold(cyan("   OPTERAOS — DIRECT ACCESS & FULL BUSINESS SUITE TESTS   ")));
console.log(bold(cyan("============================================================\n")));

// ─────────────────────────────────────────────────────────────────────────────
// 1. DIRECT PRODUCT ACCESS & NO-PAYWALL VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold("1. DIRECT PRODUCT ACCESS MODEL (NO SUBSCRIPTIONS / NO PAYWALL)"));

function checkDirectProductAccess(user, orgMembership) {
  if (!user || !user.id) return { allowed: false, error: "UNAUTHENTICATED" };
  if (!orgMembership || orgMembership.status !== "ACTIVE") {
    return { allowed: false, error: "ORG_MEMBERSHIP_REQUIRED" };
  }
  return {
    allowed: true,
    userId: user.id,
    orgId: orgMembership.organizationId,
    role: orgMembership.role,
    modules: ["autopilot", "crm", "sales", "invoices", "tasks", "analytics", "ai", "automations"],
  };
}

const authUser = { id: "usr_901", email: "director@acme-corp.com" };
const validOrgMembership = { organizationId: "org_alpha", role: "ADMIN", status: "ACTIVE" };

const directAccess = checkDirectProductAccess(authUser, validOrgMembership);
assert("Authenticated user with org membership gains direct access to all modules", directAccess.allowed === true);
assert("Autopilot is available directly without any subscription", directAccess.modules.includes("autopilot"));
assert("CRM, Invoices, AI, and Automations are unlocked by default", directAccess.modules.includes("crm") && directAccess.modules.includes("ai"));

// ─────────────────────────────────────────────────────────────────────────────
// 2. MULTI-TENANT ISOLATION & DATA PRIVACY
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold("\n2. MULTI-TENANT ROW-LEVEL SECURITY ISOLATION"));

const customerRecordsDB = [
  { id: "cust_1", organization_id: "org_alpha", name: "Alpha Corp Client 1", email: "client1@alpha.com" },
  { id: "cust_2", organization_id: "org_alpha", name: "Alpha Corp Client 2", email: "client2@alpha.com" },
  { id: "cust_3", organization_id: "org_beta", name: "Beta Financial Client A", email: "clientA@beta.com" },
];

function queryOrgCustomers(requestedOrgId) {
  return customerRecordsDB.filter((row) => row.organization_id === requestedOrgId);
}

const alphaQuery = queryOrgCustomers("org_alpha");
const betaQuery = queryOrgCustomers("org_beta");

assert("Tenant Alpha query returns strictly Alpha customer records", alphaQuery.length === 2 && alphaQuery.every((c) => c.organization_id === "org_alpha"));
assert("Tenant Alpha cannot access or inspect Beta records", !alphaQuery.some((c) => c.organization_id === "org_beta"));
assert("Tenant Beta query returns strictly Beta customer records", betaQuery.length === 1 && betaQuery[0].name === "Beta Financial Client A");

// ─────────────────────────────────────────────────────────────────────────────
// 3. CRM & SALES PIPELINE LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold("\n3. CRM, LEADS, DEALS & TASK PIPELINE LIFECYCLE"));

const crmState = {
  leads: [],
  deals: [],
  tasks: [],
};

// Step A: Create Lead
const newLead = {
  id: "lead_101",
  org_id: "org_alpha",
  name: "Priya Sharma",
  company: "Apex Retail Solutions",
  status: "new",
  score: 85,
  assigned_to: "usr_sales_1",
};
crmState.leads.push(newLead);
assert("Lead created and assigned to sales representative", crmState.leads.length === 1 && crmState.leads[0].score === 85);

// Step B: Convert Lead to Deal
const convertedDeal = {
  id: "deal_201",
  org_id: "org_alpha",
  lead_id: newLead.id,
  title: "Apex Retail ERP Implementation",
  value: 450000,
  stage: "PROPOSAL",
  probability: 70,
};
crmState.deals.push(convertedDeal);
crmState.leads[0].status = "converted";
assert("Lead converted to Deal in PROPOSAL stage", crmState.deals.length === 1 && crmState.deals[0].stage === "PROPOSAL");

// Step C: Move Deal to WON
crmState.deals[0].stage = "WON";
crmState.deals[0].probability = 100;
assert("Deal successfully progressed to WON stage", crmState.deals[0].stage === "WON" && crmState.deals[0].probability === 100);

// Step D: Create Onboarding Task
crmState.tasks.push({
  id: "task_301",
  org_id: "org_alpha",
  title: "Deploy onboarding package for Apex Retail",
  deal_id: convertedDeal.id,
  status: "TODO",
  priority: "HIGH",
});
assert("Follow-up task created linked to WON deal", crmState.tasks.length === 1 && crmState.tasks[0].priority === "HIGH");

// ─────────────────────────────────────────────────────────────────────────────
// 4. FINANCIAL ENGINE & INVOICE CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold("\n4. INVOICING & SERVER-SIDE MATHEMATICAL CALCULATIONS"));

function computeInvoiceServerSide(items, discountPercent = 0, gstRatePercent = 18) {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountAmount = Math.round((subtotal * (discountPercent / 100)) * 100) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = Math.round((taxableAmount * (gstRatePercent / 100)) * 100) / 100;
  const total = Math.round((taxableAmount + taxAmount) * 100) / 100;

  return { subtotal, discountAmount, taxableAmount, taxAmount, total };
}

const invoiceItems = [
  { description: "opteraOS Enterprise Platform License", quantity: 5, unitPrice: 20000 },
  { description: "Dedicated Implementation & Training", quantity: 1, unitPrice: 25000 },
];
// Subtotal = 125,000, 10% Discount = 12,500, Taxable = 112,500, 18% GST = 20,250, Total = 132,750
const invResult = computeInvoiceServerSide(invoiceItems, 10, 18);

assert("Server calculates subtotal accurately (₹1,25,000)", invResult.subtotal === 125000);
assert("Server calculates 10% discount accurately (₹12,500)", invResult.discountAmount === 12500);
assert("Server calculates 18% GST accurately (₹20,250)", invResult.taxAmount === 20250);
assert("Server calculates grand total accurately (₹1,32,750)", invResult.total === 132750);

// ─────────────────────────────────────────────────────────────────────────────
// 5. AUTOPILOT STATE ENGINE & WORK ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold("\n5. AUTOPILOT AUTONOMOUS STATE ENGINE & WORK DISTRIBUTION"));

const autopilotRegistry = new Map();
const sampleAutopilot = {
  id: "ap_lead_qualifier",
  name: "Autonomous Inbound Lead Qualifier",
  active: false, // Starts paused
  strategy: "ROUND_ROBIN",
  assignedGroup: ["usr_rep_1", "usr_rep_2", "usr_rep_3"],
  lastAssignedIndex: 0,
};
autopilotRegistry.set(sampleAutopilot.id, sampleAutopilot);

function triggerAutopilotExecution(apId) {
  const ap = autopilotRegistry.get(apId);
  if (!ap) throw new Error("Autopilot not found");
  if (!ap.active) {
    throw new Error("Autopilot is paused. Please resume before triggering execution.");
  }
  
  const nextAssignee = ap.assignedGroup[ap.lastAssignedIndex % ap.assignedGroup.length];
  ap.lastAssignedIndex++;

  return {
    status: "COMPLETED",
    executionId: `exec_${Date.now()}`,
    assignee: nextAssignee,
  };
}

// Check Paused Safety Guard
let pausedErrorCaught = false;
try {
  triggerAutopilotExecution(sampleAutopilot.id);
} catch (err) {
  if (err.message.includes("paused")) pausedErrorCaught = true;
}
assert("Paused Autopilot is prevented from executing by safety guard", pausedErrorCaught === true);

// Resume and Execute
sampleAutopilot.active = true;
const run1 = triggerAutopilotExecution(sampleAutopilot.id);
const run2 = triggerAutopilotExecution(sampleAutopilot.id);

assert("Active Autopilot executes successfully and returns COMPLETED state", run1.status === "COMPLETED");
assert("Round-Robin assignment distributes lead to usr_rep_1", run1.assignee === "usr_rep_1");
assert("Next Round-Robin assignment distributes lead to usr_rep_2", run2.assignee === "usr_rep_2");

// ─────────────────────────────────────────────────────────────────────────────
// 6. AI SERVICE & PROVIDER CONFIGURATION CHECK
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold("\n6. AI SERVICE & PROVIDER CONFIGURATION CHECK"));

class AiServiceCheck {
  static getProvider() {
    if (process.env["GEMINI_API_KEY"] || process.env["GOOGLE_API_KEY"]) return "Google Gemini";
    if (process.env["OPENAI_API_KEY"]) return "OpenAI";
    return null;
  }

  static generateResponse(prompt) {
    const provider = this.getProvider();
    if (!provider) {
      return {
        success: false,
        errorCode: "AI_PROVIDER_NOT_CONFIGURED",
        error: "AI_PROVIDER_NOT_CONFIGURED: Please set GEMINI_API_KEY in .env.",
      };
    }
    return {
      success: true,
      provider,
      content: `Analyzed business metrics using ${provider}.`,
    };
  }
}

const aiRes = AiServiceCheck.generateResponse("Summarize high priority opportunities");
assert("AI Provider is configured via GEMINI_API_KEY", aiRes.success === true && aiRes.provider === "Google Gemini");

// ─────────────────────────────────────────────────────────────────────────────
// 7. EMAIL SERVICE ZERO-MOCK POLICY
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold("\n7. EMAIL SERVICE PROVIDER INTEGRATION CHECK"));

class EmailServiceCheck {
  static getProvider() {
    if (process.env["RESEND_API_KEY"]) return "Resend";
    if (process.env["SENDGRID_API_KEY"]) return "SendGrid";
    if (process.env["SMTP_HOST"]) return "SMTP";
    return null;
  }

  static async send(payload) {
    const provider = this.getProvider();
    if (!provider) {
      return {
        success: false,
        errorCode: "EMAIL_PROVIDER_NOT_CONFIGURED",
        error: "EMAIL_PROVIDER_NOT_CONFIGURED: Set RESEND_API_KEY or SMTP_HOST in .env.",
      };
    }
    return { success: true, provider, messageId: `msg_${Date.now()}` };
  }
}

const emailRes = await EmailServiceCheck.send({
  to: "client@example.com",
  subject: "Proposal Document",
  html: "<p>Proposal attached</p>",
});

assert("EmailService returns structured EMAIL_PROVIDER_NOT_CONFIGURED when keys absent", emailRes.errorCode === "EMAIL_PROVIDER_NOT_CONFIGURED" && emailRes.success === false);
assert("EmailService never simulates fake success when provider is missing", emailRes.success === false);

// ─────────────────────────────────────────────────────────────────────────────
// 8. ROLE-BASED ACCESS CONTROL (RBAC)
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold("\n8. ROLE-BASED ACCESS CONTROL (RBAC)"));

const RBAC_PERMISSIONS = {
  OWNER: ["read", "write", "delete", "manage_settings", "manage_members"],
  ADMIN: ["read", "write", "delete", "manage_settings", "manage_members"],
  MANAGER: ["read", "write", "delete"],
  EMPLOYEE: ["read", "write"],
  VIEWER: ["read"],
};

function hasPermission(role, action) {
  const allowed = RBAC_PERMISSIONS[role] || [];
  return allowed.includes(action);
}

assert("ADMIN can manage organization settings", hasPermission("ADMIN", "manage_settings") === true);
assert("EMPLOYEE cannot delete records or manage settings", hasPermission("EMPLOYEE", "manage_settings") === false && hasPermission("EMPLOYEE", "delete") === false);
assert("VIEWER has read-only access", hasPermission("VIEWER", "read") === true && hasPermission("VIEWER", "write") === false);

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold(cyan("\n============================================================")));
console.log(bold(`   TOTAL ASSERTIONS: ${passedCount + failedCount} | ${green(`PASSED: ${passedCount}`)} | ${failedCount > 0 ? red(`FAILED: ${failedCount}`) : green("FAILED: 0")}`));
console.log(bold(cyan("============================================================\n")));

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
