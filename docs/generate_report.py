import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'pylibs'))

# ─────────────────────────────────────────────────────────────
#  Serandib Bank – Technical Documentation Report Generator
#  Outputs: docs/Serandib_Bank_Technical_Report.pdf
#           docs/Serandib_Bank_Technical_Report.docx
# ─────────────────────────────────────────────────────────────

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.platypus.flowables import Flowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import datetime

from docx import Document
from docx.shared import Pt, RGBColor, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUT_DIR = os.path.dirname(__file__)
PDF_PATH = os.path.join(OUT_DIR, "Serandib_Bank_Technical_Report.pdf")
DOCX_PATH = os.path.join(OUT_DIR, "Serandib_Bank_Technical_Report.docx")

BLACK   = colors.HexColor("#000000")
WHITE   = colors.HexColor("#ffffff")
DGRAY   = colors.HexColor("#1a1a1a")
LGRAY   = colors.HexColor("#f5f5f5")
MGRAY   = colors.HexColor("#cccccc")
BORDER  = colors.HexColor("#000000")

NOW = datetime.datetime.now().strftime("%B %d, %Y")

# ══════════════════════════════════════════════════════════════
#  DATA
# ══════════════════════════════════════════════════════════════

PROJECT_OVERVIEW = """
Serandib Bank is a full-stack digital banking web application developed for the Hack to Night 2026 hackathon. 
Built with Next.js 15 App Router, TypeScript, and PostgreSQL 17, the platform delivers core retail banking 
features including account management, secure fund transfers, bill payments, spending analytics, and an 
Invisible Savings engine — all within a premium, N26-inspired user interface.

The platform was built across nine development phases, progressively layering features atop a secure 
cryptographic authentication system. All sensitive operations are protected by server-side session 
validation, parameterized SQL queries, and a double-entry ledger architecture. No user-provided identifiers 
are trusted on the client side.

Demo Credentials:
  Customer: customer@serandib.test  /  SerandibUser123
  Admin:    admin@serandib.test     /  SerandibAdmin123
"""

MAIN_FUNCTIONS = [
    ["Function", "Description", "Route / Location"],
    ["User Authentication", "Secure login with bcrypt password verification, SHA-256 session tokens stored as HttpOnly cookies, rate limiting (5 attempts / 15 min)", "/api/auth/login"],
    ["Session Management", "Server-side sessions stored in PostgreSQL. requireUser() and requireAdmin() guards protect all sensitive routes.", "lib/session.ts"],
    ["Account Dashboard", "Displays total balance, quick actions, recent transactions, and Smart Spend summary fetched from live APIs.", "/dashboard"],
    ["Bank Accounts", "Lists all accounts with masked numbers, balances, status pills, and per-account actions (Send, Freeze, History).", "/bank-accounts"],
    ["Fund Transfer", "Atomic double-entry transfer engine with overdraft prevention, idempotency keys, and full ledger entry recording.", "/bank-transfer"],
    ["Bill Payments", "Pay utility, telecom, and insurance billers. Payments are recorded atomically with a unique reference and ledger entry.", "/pay-bills"],
    ["Smart Spend Analytics", "Rule-based categorization engine. Calculates financial health score, savings potential, cashflow forecast, and recurring payment detection.", "/smart-spend"],
    ["Financial Twin Simulator", "Simulates the impact of a hypothetical purchase or saving scenario on projected month-end balance. Read-only — never mutates data.", "/smart-spend"],
    ["Invisible Savings", "Rounds up partner merchant purchases to the nearest defined unit and accumulates micro-savings into a nominated savings account.", "/invisible-savings"],
    ["E-Statement", "Filterable transaction history with debit/credit summaries, type filters, search, and export-ready layout.", "/e-statement"],
    ["Security Center", "Displays audit timeline, session information, security checklist, and Account Shield mode controls.", "/security"],
    ["Audit Logging", "Every sensitive action (login, transfer, budget upsert, etc.) is written to the audit_logs table with user, IP, and metadata.", "lib/audit.ts"],
]

API_FUNCTIONS = [
    ["Endpoint", "Method", "Auth", "Description"],
    ["/api/auth/login",             "POST",   "None",  "Verify credentials, create session, set HttpOnly cookie"],
    ["/api/auth/logout",            "POST",   "User",  "Revoke session token in DB, clear cookie"],
    ["/api/auth/me",                "GET",    "User",  "Return currently authenticated user from session"],
    ["/api/accounts",               "GET",    "User",  "List all accounts owned by the authenticated user"],
    ["/api/transfer",               "POST",   "User",  "Execute atomic fund transfer with ledger entries and idempotency"],
    ["/api/transfers/[reference]",  "GET",    "User",  "Retrieve transfer receipt by reference, scoped to user"],
    ["/api/transactions",           "GET",    "User",  "Paginated transaction history for the authenticated user"],
    ["/api/beneficiaries",          "GET/POST","User", "List and add saved payees"],
    ["/api/beneficiaries/[id]",     "DELETE", "User",  "Remove a beneficiary (ownership verified server-side)"],
    ["/api/notifications",          "GET",    "User",  "Fetch unread notifications for the current user"],
    ["/api/notifications/[id]/read","POST",   "User",  "Mark a notification as read"],
    ["/api/smart-spend/summary",    "GET",    "User",  "Return full Smart Spend analytics summary for current month"],
    ["/api/smart-spend/categories", "GET",    "User",  "List all spend categories"],
    ["/api/smart-spend/budgets",    "GET/POST","User", "Fetch and upsert monthly category budgets"],
    ["/api/smart-spend/simulate",   "POST",   "User",  "Run Financial Twin simulation (read-only, no DB mutation)"],
    ["/api/health",                 "GET",    "None",  "System health check — DB connectivity and uptime"],
    ["/api/setup",                  "POST",   "None",  "Bootstrap schema and seed data on first run"],
    ["/api/admin/system",           "GET",    "Admin", "Admin-only system diagnostics and stats"],
    ["/api/search",                 "GET",    "User",  "Full-text search across transactions and accounts"],
]

NEW_FEATURES = [
    ["Phase", "Feature", "Key Details"],
    ["1", "Repo Cleanup & UI Structure", "Removed test credentials, reorganised directories, established Next.js App Router layout"],
    ["2", "Secure Database Foundation", "PostgreSQL 17 via Docker Compose, schema.sql + seed.sql, pgcrypto extension, NUMERIC(14,2) for currency"],
    ["3", "Authentication & Sessions", "bcrypt (12 rounds) password hashing, SHA-256 session tokens, HttpOnly cookies, 7-day session lifetime"],
    ["4", "Protected Banking APIs", "Server-side ownership checks on every account query, requireUser() guards, parameterized SQL throughout"],
    ["5 / 5B / 5C", "Premium Frontend Rebuild", "N26-inspired UI, CSS Grid layout system, AppShell + Sidebar components, full design token system"],
    ["6", "Atomic Transfer Engine", "BEGIN/COMMIT transactions, SELECT FOR UPDATE locking, ledger_entries double-entry, idempotency keys"],
    ["7", "Bill Payment Engine", "Biller catalogue, bill_payments table, Bill Radar analytics card, atomic payment + ledger recording"],
    ["8", "Smart Spend Analytics", "Rule-based categorisation (16+ rules), financial health score, savings potential, cashflow forecast, Financial Twin Simulator"],
    ["9", "Invisible Savings Engine", "Partner merchant round-ups, monthly sweep to savings account, invisible_savings_settings per user, per-event tracking"],
]

ERRORS_SOLUTIONS = [
    ["Error", "Root Cause", "Solution"],
    ["⚠ Database not configured", "DATABASE_URL missing from .env.local or Docker not running", "Added fast-fail check in login route; user prompted to run docker compose up db -d"],
    ["Login: Unable to process login", "SEED_DML ON CONFLICT (user_id, category_slug, period) failed when no matching unique index found on existing table", "Changed to ON CONFLICT DO NOTHING; made SEED_DML non-fatal so schema errors never block login"],
    ["SQL DO $$ block error", "PostgreSQL pg driver does not support anonymous PL/pgSQL blocks in multi-statement splits", "Replaced DO $$ END $$ with individual ALTER TABLE ... ADD COLUMN IF NOT EXISTS statements"],
    ["Blue diamond pattern on dashboard", "Old compiled .next cache served stale CSS; background property missing from .app-main-area", "Added explicit background: #f7f5f2 to globals.css; cleared .next cache and hard-reloaded browser"],
    ["EADDRINUSE :::3000", "Previous bun run dev process still holding port 3000", "lsof -ti :3000 | xargs kill -9 documented as standard restart procedure"],
    ["Property 'accountType' missing", "SafeAccount type lacked accountType field", "Derived display type from accountName string parsing"],
    ["Property 'firstName' missing", "AuthUser exposes fullName not firstName", "Used user.fullName.split(' ')[0] to derive first name"],
    ["TypeScript: focusRingColor invalid", "focusRingColor is not a valid CSS property in React inline styles", "Removed the invalid property from the style object"],
    ["Git push: Permission denied (publickey)", "No SSH key registered with GitHub", "Generated ed25519 key pair, added public key to GitHub account settings"],
    ["Git: Author identity unknown", "Fresh git init with no user config", "Configured git config --global user.email and user.name"],
    ["Canvas: Cannot read properties of undefined", "useHostTheme() return value was destructured incorrectly (tokens was undefined)", "Changed to const theme = useHostTheme() and accessed theme.stroke.secondary directly"],
    ["Audit log userId type mismatch", "writeAuditLog expected string but AuthUser.id is number", "Wrapped all userId references with String(user.id) before passing to writeAuditLog"],
    ["Smart Spend API double-wrapped response", "Route called NextResponse.json(unauthorized()) wrapping an already-complete Response", "Changed to return NextResponse.json({ error: '...' }, { status: 401 }) directly"],
    ["Login auto-redirect (unwanted)", "Middleware redirected authenticated users from /login to /dashboard", "Removed the AUTH_EXACT_PATHS redirect block from proxy.ts"],
]

TECH_STACK = [
    ["Category", "Technology / Tool", "Purpose"],
    ["Framework", "Next.js 15 (App Router)", "Full-stack React framework; SSR, API routes, middleware"],
    ["Language", "TypeScript 5", "Type safety across all frontend and backend code"],
    ["Database", "PostgreSQL 17 (Docker)", "Relational storage; NUMERIC(14,2) for money, TIMESTAMPTZ for dates"],
    ["ORM / Query", "node-postgres (pg)", "Raw parameterized SQL — no ORM, full control over queries"],
    ["Auth", "bcryptjs + crypto (Node.js)", "Password hashing (12 rounds) and SHA-256 session token hashing"],
    ["Validation", "Zod v4", "Schema validation for all API inputs; safeParse pattern throughout"],
    ["Runtime", "Bun 1.x", "Fast JS runtime and package manager replacing npm/node"],
    ["Containerisation", "Docker + Docker Compose", "PostgreSQL 17 database container with named volume persistence"],
    ["CSS", "Custom CSS Variables + Grid", "Design token system in globals.css; no Tailwind or CSS-in-JS"],
    ["Linting", "Biome", "Fast unified linter and formatter (replaces ESLint + Prettier)"],
    ["Security", "HttpOnly Cookies, SHA-256", "Session tokens never exposed to JS; raw token only in cookie"],
    ["Middleware", "Next.js Edge Middleware (proxy.ts)", "Lightweight cookie-presence check; redirects unauthenticated users"],
    ["Version Control", "Git + GitHub", "All phases committed to team404-hacktonight repository"],
    ["Deployment", "Standalone Next.js + Docker", "next.config.ts output: standalone; Dockerfile for production builds"],
]

TESTING = [
    ["Test Area", "Method", "Result"],
    ["Authentication", "Manual: login with correct/wrong credentials; rate limit at 5 attempts", "Pass"],
    ["Session protection", "Direct fetch to /api/accounts without cookie → 401", "Pass"],
    ["Fund transfer", "Transfer between accounts; verify ledger_entries rows and balance update", "Pass"],
    ["Idempotency", "Repeat POST /api/transfer with same Idempotency-Key → single execution", "Pass"],
    ["Overdraft prevention", "Attempt transfer exceeding account balance → 422 error", "Pass"],
    ["Smart Spend summary", "GET /api/smart-spend/summary without cookie → 401", "Pass"],
    ["Budget upsert", "POST /api/smart-spend/budgets; verify DB row and audit log", "Pass"],
    ["Financial Twin", "POST /api/smart-spend/simulate; confirm no balance change in DB", "Pass"],
    ["Invisible Savings", "Simulate partner purchase; verify event recorded, balance unchanged until sweep", "Pass"],
    ["Build", "bun run build → zero TypeScript errors, zero missing exports", "Pass"],
    ["Linting", "bun run lint (Biome) → all files formatted and clean", "Pass"],
    ["Responsive layout", "Tested at 1440px, 1280px, 1024px, 768px, 390px viewport widths", "Pass"],
]

ARCH_DESCRIPTION = """
The architecture follows a layered server-side pattern:

  Browser / React Client
      │
      ▼
  Next.js Edge Middleware (proxy.ts)
    Cookie-presence check only — redirects unauthenticated users
      │
      ▼
  Next.js App Router (API Route Handlers)
    Session validation via requireUser() / requireAdmin()
    Zod input validation
    Audit log write
      │
      ├── Service Layer
      │     categorization-service.ts  (rule-based spend categorisation)
      │     smart-spend-service.ts     (analytics aggregation)
      │     financial-twin-service.ts  (simulation, read-only)
      │     transfer-service.ts        (atomic transfer logic)
      │
      ├── Repository Layer
      │     accounts-repository.ts
      │     transactions-repository.ts
      │     smart-spend-repository.ts
      │     beneficiaries-repository.ts
      │
      └── Database (PostgreSQL 17 via Docker)
            Tables: users, accounts, sessions, transactions,
                    ledger_entries, bill_payments, billers,
                    spend_categories, budgets, beneficiaries,
                    notifications, audit_logs,
                    partner_merchants, invisible_savings_*
"""

# ══════════════════════════════════════════════════════════════
#  PDF GENERATOR
# ══════════════════════════════════════════════════════════════

def make_pdf():
    doc = SimpleDocTemplate(
        PDF_PATH, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()

    def S(name, **kw):
        kw.setdefault("fontName", "Helvetica")
        return ParagraphStyle(name, **kw)

    title_style   = S("T",  fontSize=26, leading=32, textColor=BLACK, spaceAfter=4, fontName="Helvetica-Bold")
    sub_style     = S("SB", fontSize=11, leading=15, textColor=DGRAY, spaceAfter=2)
    h1_style      = S("H1", fontSize=14, leading=18, textColor=BLACK, spaceBefore=18, spaceAfter=6, fontName="Helvetica-Bold")
    h2_style      = S("H2", fontSize=11, leading=15, textColor=BLACK, spaceBefore=10, spaceAfter=4, fontName="Helvetica-Bold")
    body_style    = S("B",  fontSize=9,  leading=14, textColor=DGRAY, spaceAfter=4, alignment=TA_JUSTIFY)
    mono_style    = S("M",  fontSize=8,  leading=13, textColor=DGRAY, fontName="Courier", spaceAfter=4)
    caption_style = S("C",  fontSize=8,  leading=11, textColor=DGRAY, spaceAfter=2, alignment=TA_CENTER)

    def hr(): return HRFlowable(width="100%", thickness=1, color=BLACK, spaceAfter=8, spaceBefore=4)
    def sp(h=8): return Spacer(1, h)
    def P(text, style=body_style): return Paragraph(text, style)
    def H1(text): return [P(text, h1_style), hr()]
    def H2(text): return [P(text, h2_style)]

    def table(data, col_widths=None, header_rows=1):
        t = Table(data, colWidths=col_widths, repeatRows=header_rows)
        style = TableStyle([
            ("FONTNAME",     (0,0), (-1,0),  "Helvetica-Bold"),
            ("FONTNAME",     (0,1), (-1,-1), "Helvetica"),
            ("FONTSIZE",     (0,0), (-1,-1), 8),
            ("LEADING",      (0,0), (-1,-1), 11),
            ("BACKGROUND",   (0,0), (-1,0),  BLACK),
            ("TEXTCOLOR",    (0,0), (-1,0),  WHITE),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LGRAY]),
            ("GRID",         (0,0), (-1,-1), 0.5, BORDER),
            ("VALIGN",       (0,0), (-1,-1), "TOP"),
            ("TOPPADDING",   (0,0), (-1,-1), 5),
            ("BOTTOMPADDING",(0,0), (-1,-1), 5),
            ("LEFTPADDING",  (0,0), (-1,-1), 6),
            ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ])
        t.setStyle(style)
        return t

    def wrap_table_cells(data):
        result = []
        for row in data:
            result.append([Paragraph(str(c), ParagraphStyle(
                "tc", fontName="Helvetica", fontSize=8, leading=11,
                textColor=DGRAY if row != data[0] else WHITE
            )) for c in row])
        # header row black text handled by TableStyle TEXTCOLOR
        return result

    story = []

    # ── Cover ──────────────────────────────────────────────────
    story.append(sp(60))
    story.append(P("SERANDIB BANK", ParagraphStyle("CV", fontName="Helvetica-Bold",
        fontSize=32, leading=38, textColor=BLACK, alignment=TA_CENTER)))
    story.append(sp(6))
    story.append(P("Technical Documentation Report", ParagraphStyle("CV2", fontName="Helvetica",
        fontSize=16, leading=20, textColor=DGRAY, alignment=TA_CENTER)))
    story.append(sp(12))
    story.append(HRFlowable(width="60%", thickness=2, color=BLACK, hAlign="CENTER"))
    story.append(sp(12))
    story.append(P(f"Hack to Night 2026  ·  Team 404  ·  {NOW}", ParagraphStyle("CV3",
        fontName="Helvetica", fontSize=10, leading=14, textColor=DGRAY, alignment=TA_CENTER)))
    story.append(sp(8))
    story.append(P("Confidential — Internal Technical Reference", ParagraphStyle("CV4",
        fontName="Helvetica", fontSize=9, leading=12, textColor=DGRAY, alignment=TA_CENTER)))
    story.append(PageBreak())

    # ── 1. Project Overview ────────────────────────────────────
    story += H1("1. Project Overview")
    for line in PROJECT_OVERVIEW.strip().split("\n"):
        story.append(P(line.strip() or " "))
    story.append(sp(8))

    # ── Architecture Diagram ───────────────────────────────────
    story += H2("System Architecture")
    story.append(P(ARCH_DESCRIPTION, mono_style))
    story.append(sp(8))

    # ── 2. Main Functions ──────────────────────────────────────
    story += H1("2. Main Project Functions")
    mf_data = [[Paragraph(c, ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=8,
                leading=11, textColor=WHITE if i==0 else DGRAY))
                if i==0 else Paragraph(c, ParagraphStyle("td", fontName="Helvetica", fontSize=8,
                leading=11, textColor=DGRAY))
                for c in row]
               for i, row in enumerate(MAIN_FUNCTIONS)]
    # rebuild properly
    def mk_table_data(rows):
        out = []
        for ri, row in enumerate(rows):
            out.append([Paragraph(str(c), ParagraphStyle(
                "th" if ri==0 else "td",
                fontName="Helvetica-Bold" if ri==0 else "Helvetica",
                fontSize=8, leading=11,
                textColor=WHITE if ri==0 else DGRAY)) for c in row])
        return out

    t = Table(mk_table_data(MAIN_FUNCTIONS),
              colWidths=[3.8*cm, 8.5*cm, 4.2*cm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  BLACK),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),  [WHITE, LGRAY]),
        ("GRID",          (0,0), (-1,-1), 0.5, BORDER),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(sp(8))

    # ── 3. API Functions ───────────────────────────────────────
    story += H1("3. API Endpoints")
    at = Table(mk_table_data(API_FUNCTIONS),
               colWidths=[5.2*cm, 1.5*cm, 1.4*cm, 8.4*cm], repeatRows=1)
    at.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  BLACK),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),  [WHITE, LGRAY]),
        ("GRID",          (0,0), (-1,-1), 0.5, BORDER),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
    ]))
    story.append(at)
    story.append(sp(8))
    story.append(PageBreak())

    # ── 4. New Features ────────────────────────────────────────
    story += H1("4. Features Added by Phase")
    nt = Table(mk_table_data(NEW_FEATURES),
               colWidths=[1.8*cm, 4.5*cm, 10.2*cm], repeatRows=1)
    nt.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  BLACK),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),  [WHITE, LGRAY]),
        ("GRID",          (0,0), (-1,-1), 0.5, BORDER),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
    ]))
    story.append(nt)
    story.append(sp(8))

    # ── 5. Errors & Solutions ──────────────────────────────────
    story += H1("5. Errors Found and Solutions")
    et = Table(mk_table_data(ERRORS_SOLUTIONS),
               colWidths=[4.0*cm, 5.5*cm, 7.0*cm], repeatRows=1)
    et.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  BLACK),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),  [WHITE, LGRAY]),
        ("GRID",          (0,0), (-1,-1), 0.5, BORDER),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
    ]))
    story.append(et)
    story.append(sp(8))
    story.append(PageBreak())

    # ── 6. Tech Stack ──────────────────────────────────────────
    story += H1("6. Tech Stack, Methods and Tools")
    ts = Table(mk_table_data(TECH_STACK),
               colWidths=[3.5*cm, 5.0*cm, 8.0*cm], repeatRows=1)
    ts.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  BLACK),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),  [WHITE, LGRAY]),
        ("GRID",          (0,0), (-1,-1), 0.5, BORDER),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
    ]))
    story.append(ts)
    story.append(sp(8))

    # ── 7. Testing ────────────────────────────────────────────
    story += H1("7. Testing and Verification")
    tt = Table(mk_table_data(TESTING),
               colWidths=[4.5*cm, 8.5*cm, 3.5*cm], repeatRows=1)
    tt.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  BLACK),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),  [WHITE, LGRAY]),
        ("GRID",          (0,0), (-1,-1), 0.5, BORDER),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
    ]))
    story.append(tt)

    # ── Footer note ───────────────────────────────────────────
    story.append(sp(20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=MGRAY))
    story.append(sp(4))
    story.append(P(f"Serandib Bank · Hack to Night 2026 · Team 404 · Generated {NOW}",
        ParagraphStyle("ft", fontName="Helvetica", fontSize=8, leading=11,
        textColor=MGRAY, alignment=TA_CENTER)))

    doc.build(story)
    print(f"PDF saved: {PDF_PATH}")


# ══════════════════════════════════════════════════════════════
#  DOCX GENERATOR
# ══════════════════════════════════════════════════════════════

def rgb(r,g,b): return RGBColor(r,g,b)
BLACK_RGB  = rgb(0,0,0)
WHITE_RGB  = rgb(255,255,255)
GRAY_RGB   = rgb(90,90,90)
LGRAY_RGB  = rgb(245,245,245)

def set_cell_bg(cell, hex_color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)

def add_header_row(table, headers, col_widths_cm=None):
    row = table.rows[0]
    for i, (cell, header) in enumerate(zip(row.cells, headers)):
        set_cell_bg(cell, "000000")
        para = cell.paragraphs[0]
        para.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = para.add_run(header)
        run.font.name = "Arial"
        run.font.size = Pt(8)
        run.font.bold = True
        run.font.color.rgb = WHITE_RGB
        cell.paragraphs[0].paragraph_format.space_before = Pt(2)
        cell.paragraphs[0].paragraph_format.space_after  = Pt(2)

def add_data_rows(table, rows, start=1):
    for ri, row_data in enumerate(rows):
        row = table.add_row()
        bg = "F5F5F5" if ri % 2 == 0 else "FFFFFF"
        for ci, (cell, val) in enumerate(zip(row.cells, row_data)):
            set_cell_bg(cell, bg)
            para = cell.paragraphs[0]
            run = para.add_run(str(val))
            run.font.name = "Arial"
            run.font.size = Pt(8)
            run.font.color.rgb = GRAY_RGB
            para.paragraph_format.space_before = Pt(1)
            para.paragraph_format.space_after  = Pt(1)

def make_docx_table(doc, headers, data_rows, col_widths_cm):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.LEFT
    add_header_row(t, headers)
    add_data_rows(t, data_rows)
    # set column widths
    for row in t.rows:
        for i, cell in enumerate(row.cells):
            cell.width = Cm(col_widths_cm[i])
    return t

def heading(doc, text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16 if level==1 else 8)
    p.paragraph_format.space_after  = Pt(4)
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.bold = True
    run.font.size = Pt(14 if level==1 else 11)
    run.font.color.rgb = BLACK_RGB
    if level == 1:
        # underline via border
        pPr = p._p.get_or_add_pPr()
        pBdr = OxmlElement("w:pBdr")
        bottom = OxmlElement("w:bottom")
        bottom.set(qn("w:val"), "single")
        bottom.set(qn("w:sz"), "6")
        bottom.set(qn("w:space"), "1")
        bottom.set(qn("w:color"), "000000")
        pBdr.append(bottom)
        pPr.append(pBdr)

def body_para(doc, text, mono=False, size=9):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after  = Pt(3)
    run = p.add_run(text)
    run.font.name = "Courier New" if mono else "Arial"
    run.font.size = Pt(size)
    run.font.color.rgb = GRAY_RGB

def make_docx():
    doc = Document()

    # Page margins
    for section in doc.sections:
        section.top_margin    = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin   = Cm(2.5)
        section.right_margin  = Cm(2.5)

    # Cover
    doc.add_paragraph()
    doc.add_paragraph()
    cover = doc.add_paragraph()
    cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = cover.add_run("SERANDIB BANK")
    r.font.name = "Arial"; r.font.size = Pt(28); r.font.bold = True; r.font.color.rgb = BLACK_RGB

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rs = sub.add_run("Technical Documentation Report")
    rs.font.name = "Arial"; rs.font.size = Pt(14); rs.font.color.rgb = GRAY_RGB

    doc.add_paragraph()
    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rm = meta.add_run(f"Hack to Night 2026  ·  Team 404  ·  {NOW}")
    rm.font.name = "Arial"; rm.font.size = Pt(10); rm.font.color.rgb = GRAY_RGB

    doc.add_page_break()

    # 1. Overview
    heading(doc, "1. Project Overview")
    for line in PROJECT_OVERVIEW.strip().split("\n"):
        body_para(doc, line.strip())

    # Architecture Diagram
    heading(doc, "System Architecture", level=2)
    body_para(doc, ARCH_DESCRIPTION.strip(), mono=True, size=8)

    doc.add_paragraph()

    # 2. Main Functions
    heading(doc, "2. Main Project Functions")
    make_docx_table(doc, MAIN_FUNCTIONS[0], MAIN_FUNCTIONS[1:],
                    col_widths_cm=[3.5, 8.5, 4.5])
    doc.add_paragraph()

    # 3. API Functions
    heading(doc, "3. API Endpoints")
    make_docx_table(doc, API_FUNCTIONS[0], API_FUNCTIONS[1:],
                    col_widths_cm=[5.0, 1.5, 1.5, 8.5])
    doc.add_paragraph()

    doc.add_page_break()

    # 4. New Features
    heading(doc, "4. Features Added by Phase")
    make_docx_table(doc, NEW_FEATURES[0], NEW_FEATURES[1:],
                    col_widths_cm=[1.8, 4.5, 10.2])
    doc.add_paragraph()

    # 5. Errors
    heading(doc, "5. Errors Found and Solutions")
    make_docx_table(doc, ERRORS_SOLUTIONS[0], ERRORS_SOLUTIONS[1:],
                    col_widths_cm=[4.0, 5.5, 7.0])
    doc.add_paragraph()

    doc.add_page_break()

    # 6. Tech Stack
    heading(doc, "6. Tech Stack, Methods and Tools")
    make_docx_table(doc, TECH_STACK[0], TECH_STACK[1:],
                    col_widths_cm=[3.5, 5.0, 8.0])
    doc.add_paragraph()

    # 7. Testing
    heading(doc, "7. Testing and Verification")
    make_docx_table(doc, TESTING[0], TESTING[1:],
                    col_widths_cm=[4.5, 8.5, 3.5])
    doc.add_paragraph()

    # Footer
    footer_p = doc.add_paragraph()
    footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fr = footer_p.add_run(f"Serandib Bank · Hack to Night 2026 · Team 404 · Generated {NOW}")
    fr.font.name = "Arial"; fr.font.size = Pt(8); fr.font.color.rgb = GRAY_RGB

    doc.save(DOCX_PATH)
    print(f"DOCX saved: {DOCX_PATH}")


if __name__ == "__main__":
    make_pdf()
    make_docx()
    print("Done.")
