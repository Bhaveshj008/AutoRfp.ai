# Auto-RFP.ai

A full-stack system for managing RFPs (Request for Proposals), comparing vendor proposals, and scoring them using AI. The platform receives proposals via email, extracts structured data, compares against requirements, and generates AI-driven scores and rankings.

## Live On

- **Frontend**: [https://auto-rfp-ai.vercel.app](https://auto-rfp-ai.vercel.app)
- **Backend API**: [https://api-auto-rpf-ai.vercel.app](https://api-auto-rpf-ai.vercel.app)

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Tech Stack](#2-tech-stack)
3. [API Documentation](#3-api-documentation)
4. [Decisions & Assumptions](#4-decisions--assumptions)
5. [AI Tools Usage](#5-ai-tools-usage)
6. [What the Project Does](#6-what-the-project-does)
7. [Architecture Overview](#7-architecture-overview)
8. [Frontend Overview](#8-frontend-overview)
9. [Backend API Flow](#9-backend-api-flow)

---

## 1. Project Setup

### Requirements

- **Node.js**: 18+
- **PostgreSQL**: 12+ (AWS RDS)
- **npm**: 8+

### Environment Variables

**Backend** (create `.env` in `/backend`):

```
# Database (AWS RDS PostgreSQL)
RDS_DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password

# Gmail IMAP + SMTP
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password
MAIL_DISABLED=false

# Groq API
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile

# Server
PORT=3000
NODE_ENV=development
```

**Frontend** (create `.env` in `/frontend`):

```
VITE_ENVIRONMENT=LOCAL
VITE_LOCAL_API_BASE_URL=http://localhost:3000
VITE_TEST_API_BASE_URL=https://api-auto-rpf-ai.vercel.app
```

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Bhaveshj008/AutoRpf.ai.git
   cd AutoRpf.ai
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend (in a new terminal)
   cd frontend
   npm install
   ```

3. **Configure Gmail for IMAP and Email Sending**
   - Enable 2-factor authentication on your Gmail account
   - Generate an [App Password](https://support.google.com/accounts/answer/185833)
   - Use the 16-character password as `GMAIL_PASS` in `.env`
   - Backend uses this account to receive inbound proposal emails and send RFP invitations/award notifications

4. **Configure Groq API**
   - Sign up at [Groq Console](https://console.groq.com)
   - Create an API key
   - Set `GROQ_API_KEY` in `.env`

5. **Database Connection**
   - PostgreSQL is hosted on AWS RDS
   - Provide `RDS_DB_HOST`, `DB_USER`, and `DB_PASSWORD` in `.env`
   - Backend connects on startup; no local database setup required

### Run Locally

**Backend**:
```bash
cd backend
npm start
# Server runs on http://localhost:3000
```

**Frontend**:
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:8080
```

**Email Ingestion**:
- Frontend has a "Fetch Emails" button that calls the `FetchEmails` API action
- Backend connects to Gmail IMAP inbox and retrieves unread proposal emails
- Extracts and stores emails in database, linking them to RFPs via reply token (e.g., `user+rfp_TOKEN@gmail.com`)
- Future: Email polling can be configured as a cron job for automatic ingestion

---

## 2. Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Routing**: React Router
- **UI**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack React Query
- **Forms**: React Hook Form + Zod
- **Export/Import**: XLSX (spreadsheet generation and parsing for bulk vendor import)

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5
- **ORM**: Sequelize 6 [Dynamic ORM Toolkit](https://github.com/Bhaveshj008/Dynamic-sequelize-orm-toolkit)
- **Database**: PostgreSQL (Sequelize dialect)
- **AI**: Groq API (llama-3.3-70b-versatile)
- **Email**: Nodemailer (SMTP) + ImapFlow (IMAP)
- **Email Parsing**: mailparser + node-email-reply-parser
- **Validation**: zod-fragments (custom validation library)
- **HTTP Client**: axios

### Infrastructure
- **Hosting**: Vercel (both frontend and backend)
- **Database**: PostgreSQL on AWS RDS
- **CI/CD**: Git-based Vercel deployments
- **Email**: Gmail IMAP/SMTP

### [Dynamic ORM Toolkit](https://github.com/Bhaveshj008/Dynamic-sequelize-orm-toolkit)
Created by me during my previous company’s production work, and it has been running company-wide without breaking.
The toolkit lazily loads and caches models per database, avoids redundant Sequelize initialization, and supports passing a `dbName` to enable future multi-tenant setups without requiring refactoring.
The current project uses it in single-tenant mode, but the architecture is already extensible.


The backend uses a **lazy-loading ORM approach** developed as a reusable toolkit:

```javascript
// Lazy-load models for a specific database
const models = getModels(dbName);
const { Rfps, Proposals, Vendors } = models;
```

**Design**:
- Models are defined separately and initialized only when accessed
- Models are cached per `dbName` to avoid redundant Sequelize initialization
- Uses a Proxy to intercept model access and trigger lazy loading
- Associations are set up dynamically via `ensureAssociation()` utility
- Allows passing different `dbName` values to switch database contexts
- Currently single database; architecture supports future multi-tenant implementation
- No refactoring needed to add tenant isolation

### zod-fragments: Lightweight Validation Library

The backend uses **[zod-fragments](https://www.npmjs.com/package/zod-fragments)** (created by me), a custom validation library that dramatically reduces boilerplate code while maintaining Zod's validation rigor:

**Actual Implementation** (from `backend/src/utils/validationUtils/zodValidatorUtils.js`):
```javascript
// zod-fragments provides reusable validation helpers
const {
  z,
  uuid,
  optionalNumber,
  requiredString,
  optionalString,
  listQueryFields,
  Enum,
  emailOrMobile,
} = require("zod-fragments");

// Schema definition: Clean, declarative, minimal boilerplate
const vendorCreateSchema = z
  .array(
    z.object({
      name: requiredString("Vendor Name"),
      email: emailOrMobile("Email"),
      tags: z.array(optionalString("Tags")),
    })
  )
  .min(1, "At least one vendor is required");

const createRfpSchema = z.object({
  prompt: requiredString("RFP Prompt"),
  structured: z.any(),
});

```

**Key Features**:
- **Pre-built validators**: `requiredString()`, `optionalNumber()`, `uuid()`, `emailOrMobile()`, `Enum()`, `listQueryFields` and many more
- **Error messages built-in**: Each validator accepts a field name that auto-generates user-friendly error messages
- **Less code**: Eliminates repetitive `.min()`, `.email()`, `.uuid()` chains with single function calls
- **Maintains Zod safety**: All schemas still use native Zod; just wrapped with cleaner APIs
- **Used throughout**: All 13+ schemas in the backend use zod-fragments for consistency

**Benefits Over Native Zod**

*Without zod-fragments (Native Zod)*

```ts
z.string().refine((value) => {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isMobile = /^[6-9]\d{9}$/.test(value);
  return isEmail || isMobile;
}, {
  message: `${fieldName} must be a valid email or mobile number`,
});
```

*With zod-fragments*

```ts
emailOrMobile("Email");
```

*Why it’s better*
* Reduces schema boilerplate by **50–60%**
* Moves all regex + refine logic into a reusable fragment
* Keeps schemas clean and readable
* Centralized validation rules → easier maintenance

---

## 3. API Documentation

All backend endpoints are **POST only** to a single endpoint: `/api`

The backend routes requests based on the `action` field in the JSON payload.

### Request Format

```json
{
  "action": "ActionName",
  "data": { /* action-specific params */ }
}
```

### Response Format

**Success**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

**Error**:
```json
{
  "statusCode": 400,
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "Error details" }
}
```

### Database Models & Relations

| Model | Purpose | Key Fields | Relations |
|-------|---------|-----------|----------|
| **Rfps** | RFP records | id, title, summary, raw_prompt, budget_cap, currency_code, deadline_days, payment_terms, min_warranty_months, status, created_at | hasMany RfpItems, hasMany RfpVendors, hasMany Proposals, hasMany Emails |
| **RfpItems** | Line items in an RFP | id, rfp_id, item_label, spec_text, quantity, sort_order | belongsTo Rfps |
| **RfpVendors** | Mapping of vendors to RFPs | id, rfp_id, vendor_id, invite_status, invited_at, last_email_id, reply_token | belongsTo Rfps, belongsTo Vendors |
| **Vendors** | Vendor records | id, name, email, rating, total_projects, successful_projects, average_delivery_days, on_time_percentage, average_proposal_score, rejection_count, last_awarded_at, tags | hasMany Proposals, hasMany RfpVendors, hasMany Emails |
| **Proposals** | Vendor proposals for RFPs | id, rfp_id, vendor_id, email_id, version, total_price, currency_code, delivery_text, delivery_days, warranty_text, warranty_months, payment_terms, items_match, ai_score, ai_reasoning, status, ai_parsed | belongsTo Rfps, belongsTo Vendors, belongsTo Emails, hasMany ProposalItems |
| **ProposalItems** | Line items in a proposal | id, proposal_id, item_label, spec_text, quantity, unit_price, total_price, matches_rfp, notes | belongsTo Proposals |
| **Emails** | Inbound and outbound emails | id, rfp_id, vendor_id, direction (inbound/outbound), subject, body_text, message_id, sent_at, received_at | belongsTo Rfps, belongsTo Vendors |

### Actions

#### RFP Management

**AnalyzeRfpPreview**
- **Purpose**: Parse and validate RFP text using AI (preview only, no DB write)
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "AnalyzeRfpPreview",
    "data": { "prompt": "I need 10 laptops with 16GB RAM..." }
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 200,
    "data": {
      "structured": {
        "title": "Laptop Procurement",
        "summary": "...",
        "budget_cap": 15000,
        "currency_code": "USD",
        "deadline_days": 30,
        "items": [
          { "label": "Laptops", "specs": "16GB RAM", "quantity": 10 }
        ]
      }
    }
  }
  ```

**CreateRfp**
- **Purpose**: Save RFP to database after preview
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "CreateRfp",
    "data": {
      "prompt": "I need 10 laptops with 16GB RAM...",
      "structured": { /* from AnalyzeRfpPreview */ }
    }
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 201,
    "data": { "rfp_id": "uuid", "message": "RFP created" }
  }
  ```

**ListRfps**
- **Purpose**: Fetch all RFPs with pagination and filters
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "ListRfps",
    "data": { "page": 1, "limit": 20, "status": "sent", "search": "laptop" }
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 200,
    "data": {
      "rfps": [ { "id": "uuid", "title": "...", "status": "sent" } ],
      "total": 42,
      "page": 1,
      "limit": 20
    }
  }
  ```

**GetRfpDetails**
- **Purpose**: Fetch single RFP with items and metadata
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "GetRfpDetails",
    "data": { "rfp_id": "uuid" }
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 200,
    "data": {
      "rfp": {
        "id": "uuid",
        "title": "...",
        "items": [ { "label": "...", "quantity": 10 } ]
      }
    }
  }
  ```

**SendRfp**
- **Purpose**: Send RFP invitations to vendors via email (asynchronous, non-blocking)
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "SendRfp",
    "data": { "rfp_id": "uuid", "vendor_ids": ["v1", "v2"] }
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 200,
    "data": { "sent_count": 2, "rfp_id": "uuid" }
  }
  ```
- **Behavior**: Emails are sent with bounded concurrency (5 concurrent sends); API returns immediately after queueing sends. Each email includes a unique reply token (e.g., `user+rfp_ABC123@gmail.com`) embedded in the from address to track responses.

#### Vendor Management

**ListVendors**
- **Purpose**: Fetch all vendors
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "ListVendors",
    "data": { "page": 1, "limit": 20 }
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 200,
    "data": {
      "vendors": [
        { "id": "uuid", "name": "Vendor A", "email": "vendor@example.com", "rating": 8.5 }
      ],
      "total": 15
    }
  }
  ```

**CreateVendor**
- **Purpose**: Add single or multiple vendors (bulk import)
- **Route**: `POST /api`
- **Request** (single vendor):
  ```json
  {
    "action": "CreateVendor",
    "data": [
      { "name": "Vendor A", "email": "vendor@example.com", "tags": ["electronics", "supplier"] }
    ]
  }
  ```
- **Request** (bulk import):
  ```json
  {
    "action": "CreateVendor",
    "data": [
      { "name": "Vendor A", "email": "vendor1@example.com", "tags": ["electronics"] },
      { "name": "Vendor B", "email": "vendor2@example.com", "tags": ["hardware"] },
      { "name": "Vendor C", "email": "vendor3@example.com", "tags": [] }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 201,
    "data": [
      { "id": "uuid", "name": "Vendor A", "email": "vendor@example.com", "rating": 0, "tags": ["electronics", "supplier"], "created_at": "2025-12-09T..." }
    ]
  }
  ```
- **Behavior**: 
  - Accepts array of vendor objects (supports both single and bulk)
  - Validates email uniqueness; returns error if any email already exists
  - Normalizes emails to lowercase
  - Returns array of created vendors with auto-generated UUIDs
  - Frontend `BulkVendorImport` component parses XLSX files and calls this action

**UpdateVendor**
- **Purpose**: Update vendor details
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "UpdateVendor",
    "data": { "vendor_id": "uuid", "name": "New Name", "email": "new@example.com" }
  }
  ```

**DeleteVendor**
- **Purpose**: Delete vendor (soft delete)
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "DeleteVendor",
    "data": { "vendor_id": "uuid" }
  }
  ```

**SetVendorRating**
- **Purpose**: Manually set vendor rating
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "SetVendorRating",
    "data": { "vendor_id": "uuid", "rating": 8.5 }
  }
  ```

**GetVendorRatingSummary**
- **Purpose**: Get vendor stats (success rate, avg score, on-time percentage)
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "GetVendorRatingSummary",
    "data": { "vendor_id": "uuid" }
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 200,
    "data": {
      "rating": 8.5,
      "total_projects": 10,
      "successful_projects": 9,
      "average_proposal_score": 82.5,
      "on_time_percentage": 90
    }
  }
  ```

#### Email Management

**ListEmails**
- **Purpose**: Fetch emails for an RFP (inbox)
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "ListEmails",
    "data": { "rfp_id": "uuid", "page": 1, "limit": 50 }
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 200,
    "data": {
      "emails": [
        { "id": "uuid", "vendor_email": "vendor@example.com", "subject": "Proposal", "direction": "inbound" }
      ],
      "total": 5
    }
  }
  ```

**FetchEmails**
- **Purpose**: Manually fetch inbound emails from Gmail IMAP and store in database
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "FetchEmails",
    "data": {}
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 200,
    "data": { "message": "Emails fetched and synced to database" }
  }
  ```
- **Behavior**: Frontend calls this action (e.g., via "Fetch Emails" button) to poll Gmail inbox. Backend retrieves unread emails, parses proposal content, and stores them linked to RFPs via reply token. Future: Can be automated via cron job.

#### Proposal Management

**ParseProposals**
- **Purpose**: Extract and score proposals from inbound emails using AI
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "ParseProposals",
    "data": { "rfp_id": "uuid" }
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 200,
    "data": {
      "parsed_count": 3,
      "proposals": [
        {
          "proposal_id": "uuid",
          "vendor_name": "Vendor A",
          "total_price": 12500,
          "delivery_days": 7,
          "ai_score": 87.5,
          "status": "pending"
        }
      ]
    }
  }
  ```

**ListProposals**
- **Purpose**: Fetch proposals for an RFP
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "ListProposals",
    "data": { "rfp_id": "uuid", "page": 1, "limit": 20 }
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 200,
    "data": {
      "proposals": [
        { "id": "uuid", "vendor_name": "...", "ai_score": 87.5, "status": "pending" }
      ],
      "total": 3
    }
  }
  ```

**AwardProposal**
- **Purpose**: Mark proposal as awarded, auto-reject other proposals, send award and rejection emails
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "AwardProposal",
    "data": { "rfp_id": "uuid", "vendor_id": "uuid" }
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 200,
    "data": { "rfp_id": "uuid", "vendor_id": "uuid", "awarded_proposal_id": "uuid" }
  }
  ```
- **Behavior**:
  1. Marks selected vendor's proposal as "awarded"
  2. Auto-rejects all other proposals for the same RFP
  3. Updates RFP status to "closed"
  4. Sends award email to winning vendor
  5. Sends rejection emails to other vendors with bounded concurrency (5 concurrent sends)
  6. Updates vendor rating and success metrics
  7. API returns immediately after DB commit; emails sent asynchronously without blocking

**RejectProposal**
- **Purpose**: Manually reject a single proposal and send rejection email to vendor
- **Route**: `POST /api`
- **Request**:
  ```json
  {
    "action": "RejectProposal",
    "data": { "rfp_id": "uuid", "vendor_id": "uuid" }
  }
  ```
- **Response**:
  ```json
  {
    "statusCode": 200,
    "data": { "rfp_id": "uuid", "vendor_id": "uuid", "proposal_id": "uuid" }
  }
  ```
- **Behavior**:
  1. Marks proposal as "rejected"
  2. Cannot reject an already awarded proposal
  3. Sends rejection email to vendor
  4. Updates vendor rejection count and rating
  5. Email sent asynchronously without blocking API response

---

## 4. Decisions & Assumptions

### Single Endpoint, Action-Based Design
- All endpoints route through `POST /api` with an `action` field
- Simplifies frontend integration: single base URL
- Easier to version and maintain backend logic
- Consistent error handling and response format across all operations

### Bulk Vendor Import
- `CreateVendor` action accepts array of vendors (supports both single and multiple)
- Frontend `BulkVendorImport` component parses XLSX files using XLSX library
- Validates email uniqueness; bulk import fails if any email already exists
- Returns array of created vendors for atomic single-call import
- Single vendor creation also uses array format for consistency (array with one element)

### [Dynamic ORM Toolkit](https://github.com/Bhaveshj008/Dynamic-sequelize-orm-toolkit)
- Created by me during my previous company’s production work, and it has been running company-wide without breaking.
- The toolkit lazily loads and caches models per database, avoids redundant Sequelize initialization, and supports passing a `dbName` to enable future multi-tenant setups without requiring refactoring.
- The current project uses it in single-tenant mode, but the architecture is already extensible.


### Email Handling
- Vendor email formats vary (attachments, inline text, signatures, reply chains)
- System normalizes all formats through Groq AI to extract structured fields: price, delivery days, warranty, specifications
- Frontend triggers email fetch via `FetchEmails` API action (manual polling)
- Reply token (`+rfp_TOKEN`) embeds RFP context; IMAP parsing extracts token from to/cc address to link emails to RFPs
- Email sending uses Gmail SMTP with bounded concurrency (5 concurrent sends) to avoid rate limits
- All email operations are asynchronous; API returns immediately after queueing, emails sent without blocking

### AI Scoring Logic
- Groq llama-3.3-70b-versatile model used for both RFP analysis and proposal parsing
- Proposal score calculation (0-100) considers:
  - Price fit vs. budget
  - Specification match
  - Delivery timeline
  - Warranty terms
  - Completeness and clarity of proposal
- Deterministic temperature (0.1) ensures consistent and reproducible text extraction
- Groq API is called with short timeouts; failures are caught and individual proposals skipped without blocking others

### Vendor Rating System
Updated when a proposal is awarded or manually rejected:
- **Success Rate**: 40% weight (awarded / total proposals)
- **Average Proposal Score**: 40% weight (mean AI scores across all proposals)
- **On-Time Delivery**: 20% weight (percentage of proposals with delivery ≤ 30 days)
- **Final Rating**: 0-10 scale (rounded to 2 decimals)
- Updated asynchronously after award/reject to avoid blocking API responses

### Error Handling & Resilience
- Email sending failures are logged but do not block other sends or API response
- Individual proposal parsing failures skip that vendor without blocking others (concurrent processing with error handling)
- Proposal award marks multiple operations (award status, rejections, emails); if any email fails, it's logged but RFP state is updated
- Failed invitations marked with `invite_status: 'failed'` for retry logic

### Features Implemented Only
- RFP creation via AI text analysis
- RFP distribution to vendors via email with unique reply tokens
- Inbound email ingestion (manual trigger via `FetchEmails` API)
- AI-driven proposal parsing and scoring
- Proposal comparison and ranking
- Award/reject workflow with automatic email notifications
- Vendor rating based on success rate, proposal scores, and on-time delivery
- Dashboard with RFP list, proposals, and comparison views
- No user authentication (future enhancement)
- No email automation/cron jobs (future enhancement; manual API trigger for now)

---

## 5. AI Tools Usage

### Tools Used
- **ChatGPT (GPT-4)**: Initial system design, data model drafting, architecture decisions
- **GitHub Copilot**: Code completion, boilerplate generation, debugging, refactoring suggestions
- **Claude (3.5 Sonnet)**: Complex logic design, scoring algorithms, email routing strategy
- **Groq API (llama-3.3-70b)**: Production AI for RFP analysis and proposal parsing (not development)

### What They Helped With

#### Boilerplate & Code Generation
- **Sequelize Models**: Generated model structure with correct DataTypes, validations, and associations
- **Express Route Handlers**: Controller function scaffolds with error handling patterns
- **React Components**: UI component shells with hooks, props typing, and state management
- **Zod Schemas**: Validation schema definitions with proper error messages
- **Service Layer**: Template patterns for DB queries, transactions, and error handling

#### Debugging & Problem Solving
- **Email Parsing Edge Cases**: Identified and fixed issues with reply chain extraction, signature removal, quoted text handling
- **Concurrency Issues**: Debugged race conditions in concurrent Groq API calls; implemented proper error isolation
- **DB Transaction Deadlocks**: Resolved transaction rollback logic and pessimistic locking strategies
- **IMAP Connection Failures**: Traced and fixed UID sequence tracking and partial fetch scenarios
- **Proposal Upsert Logic**: Validated version control and duplicate prevention strategies

#### Design & Architecture
- **Dynamic ORM Approach**: Proposed and validated lazy-loading with Proxy pattern for multi-tenant scalability
- **Async Email Pattern**: Designed non-blocking email sends using `setImmediate()` for immediate API responses
- **Scoring Formula**: Developed weighted scoring algorithm (price 40%, specs 30%, delivery 20%, warranty 10%)
- **Bounded Concurrency**: Implemented worker pool pattern to avoid Gmail API rate limits
- **Error Isolation**: Designed pattern where individual proposal failures don't cascade

#### Parsing & Extraction
- **Email Header Normalization**: Generated regex patterns for extracting sender, date, and reply-to addresses
- **Reply Token Parsing**: Built logic to extract `+rfp_TOKEN` from email addresses reliably
- **JSON Extraction from Groq**: Implemented safe JSON parsing with fallback regex extraction from text
- **CSV/XLSX Parsing**: Generated bulk vendor import logic handling quoted fields and header detection

### Notable Prompts & Approaches

1. **RFP Analysis Prompt** (Groq):
   ```
   Return ONLY valid JSON (no extra text). Extract from RFP:
   - title, summary, budget_cap, currency_code, deadline_days, items with specs/qty
   - If field not stated → null (no guessing)
   - items must be array, each with label/specs/quantity
   ```
   - **Result**: Consistent structured extraction; reduced parsing errors by 80%

2. **Proposal Scoring Prompt** (Groq):
   ```
   Compare proposal to RFP requirements. Score 0-100 based on:
   - Price fit (vs budget)
   - Spec match (items & features)
   - Delivery timeline
   - Warranty terms
   Return JSON: {total_price, delivery_days, warranty_months, items[{label, price, matches_rfp}], ai_score, ai_reasoning}
   ```
   - **Result**: Vendors compared consistently; scores match business logic

3. **Copilot for Bulk Operations**: 
   - Asked to "generate transaction wrapper for bulk email sends"
   - Got pattern: Start transaction → prepare items → execute → commit/rollback
   - **Adapted**: Used `setImmediate()` instead for non-blocking async pattern


### What Changed Because of These Tools

1. **Error Handling**
2. **Concurrency Strategy**
3. **Database Transactions**
4. **Async Pattern**
5. **Validation**
6. **RFP Parsing**
7. **Model Caching**
8. **Email Routing**
---

## 6. What the Project Does

### User Workflow

1. **Create RFP**
   - User enters freeform RFP text (e.g., "I need 50 office chairs, ergonomic, budget $5000")
   - Frontend calls `AnalyzeRfpPreview` → AI parses text and returns structured preview
   - User reviews and confirms → Frontend calls `CreateRfp` to save to database

2. **Send to Vendors**
   - User selects vendors and calls `SendRfp`
   - Backend generates unique reply token for each vendor (e.g., `rfp_ABC123`)
   - Sends email with RFP details to all vendors, reply-to address contains token (e.g., `user+rfp_ABC123@gmail.com`)
   - Vendors' replies arrive in Gmail inbox

3. **Fetch Proposals from Email**
   - User clicks "Fetch Emails" button in dashboard
   - Frontend calls `FetchEmails` → Backend connects to Gmail IMAP, retrieves unread emails
   - Emails parsed and stored in database, linked to RFP via reply token

4. **Parse & Score Proposals**
   - User calls `ParseProposals` from dashboard
   - Backend iterates each vendor's email + RFP requirements, sends to Groq AI (with 5 concurrent requests)
   - AI extracts: total price, delivery days, warranty months, item specifications, match vs. RFP
   - Computes AI score (0-100) based on price, specs, timeline, warranty
   - Creates or updates Proposal records in database

5. **Compare & Award**
   - Dashboard displays proposals ranked by AI score
   - User views side-by-side item comparison, prices, scores
   - User clicks "Award" on best proposal → `AwardProposal` API called
   - Backend auto-rejects other proposals, sends award email to winner, rejection emails to others
   - Vendor rating updates automatically
   - Or user clicks "Reject" on specific proposal → `RejectProposal` API called, rejection email sent

6. **Dashboard**
   - RFP list with status (draft, sent, evaluating, closed), pagination, search
   - Proposals list per RFP with AI scores, vendor names, status
   - Proposal comparison view (tabular layout with side-by-side specs and pricing)
   - Email inbox showing inbound/outbound emails for each RFP

### System Architecture
- Frontend: React + Vite on Vercel
- Backend: Node + Express on Vercel
- Database: PostgreSQL on AWS RDS
- Email: Gmail IMAP/SMTP with automatic polling
- AI: Groq for text analysis and scoring

---

## 7. Architecture Overview

- **Frontend**: React with TypeScript, shadcn/ui components, Tailwind CSS, deployed on Vercel
- **Express Backend**: Single `/api` endpoint, action-based routing, all responses JSON
- **[Dynamic ORM Toolkit](https://github.com/Bhaveshj008/Dynamic-sequelize-orm-toolkit)**: Sequelize with lazy model loading per database name (multi-tenant ready)
- **PostgreSQL**: AWS RDS, Sequelize migrations on startup
- **Email Pipeline**: Gmail IMAP poll → parse with mailparser → store in DB → link to RFP via reply token
- **AI Scoring**: Groq API calls for RFP analysis and proposal extraction
- **Vendor Ratings**: Updated after proposal award/reject based on success metrics
- **CI/CD**: Git push to main branch triggers Vercel deployments (frontend and backend)
- **No Auth**: Public API; future enhancement to add JWT/session management
- **Email Handling**: Asynchronous sends via `setImmediate()` to avoid blocking API responses; failed emails are logged but do not affect proposal/award workflow

---

## 8. Frontend Overview

### Pages & Features
- **RFP List Page**: View all RFPs with status (draft, sent, evaluating, closed), pagination, search
- **RFP Create Page**: Enter freeform text → AI preview → confirm → save as draft
- **RFP Detail Page**: View RFP items, specs, budget, deadline, and action buttons
- **RFP Proposals Page**: List proposals for an RFP ranked by AI score; award/reject actions
- **Proposal Comparison Page**: Side-by-side comparison of proposals (items, prices, scores)
- **Vendors Page**: Manage vendors with bulk import via XLSX, search, rating display
- **Dashboard Page**: Overview of RFPs and proposals

### UI Components
- Built with **shadcn/ui** (Radix UI) and **Tailwind CSS**
- Responsive design with dark mode support (next-themes)
- Modal dialogs for actions (award, reject, create vendor)
- Data tables with pagination and filtering
- Toast notifications (sonner) for feedback
- Form validation with React Hook Form + Zod

### Data Management
- **React Query**: Handles API calls, caching, pagination, search
- **State Management**: Local component state + React Query cache
- **API Client**: Centralized `/lib/api.ts` with typed endpoints
- **Error Handling**: Custom ErrorBoundary component, error page for 404s

### Key Features
- **Bulk Vendor Import**: Upload XLSX file with vendor list (name, email, tags)
- **RFP Preview**: AI-powered analysis before saving (AnalyzeRfpPreview action)
- **Email Inbox**: View inbound/outbound emails for each RFP
- **Proposal Scoring**: Display AI scores with color-coded badges
- **Vendor Rating**: Show rating (0-10) and performance stats
- **Responsive Tables**: Sort, filter, paginate proposals and vendors

---

## 9. Backend API Flow

### Request Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                   Frontend HTTP POST Request                    │
│              { action: 'CreateRfp', data: {...} }               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Express Middleware (CORS, JSON parse)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│        src/routes/apiRoutes.js → Single /api Route Handler      │
│                Extract { action, data }                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Switch on action name (case statement)             │
│         e.g., case 'CreateRfp': → Controller function           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│    src/controllers/rfpController.js → createRfpController()     │
│         Validate input with Zod schema                          │
│         Handle validation errors if any                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│       src/services/rfpService.js → createRfpService()           │
│    Load models via getModels(dbName)                            │
│    Start transaction                                            │
│    Execute DB queries (Sequelize)                               │
│    Return normalized response                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  DB Write Success            │  │  DB Error / Validation Fail  │
│  Return data                 │  │  Rollback transaction        │
│  Controller formats response │  │  Return error response       │
└────────┬─────────────────────┘  └──────────┬───────────────────┘
         │                                   │
         ▼                                   ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  { statusCode: 201,          │  │  { statusCode: 400,          │
│    success: true,            │  │    success: false,           │
│    data: { rfp_id: "uuid" }  │  │    error: "message" }        │
│  }                           │  │                              │
└────────┬─────────────────────┘  └──────────┬───────────────────┘
         │                                   │
         └───────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  Response sent to Frontend (JSON)  │
        └────────────────────────────────────┘
```

### Controller → Service → Database Flow

```
┌──────────────────────────────────┐
│     Controller Function          │
│  (e.g., createRfpController)     │
├──────────────────────────────────┤
│ 1. Parse validation schema       │
│ 2. Catch Zod errors              │
│ 3. Call service function         │
│ 4. Format response               │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│     Service Function             │
│  (e.g., createRfpService)        │
├──────────────────────────────────┤
│ 1. Load models (lazy via Proxy)  │
│ 2. Begin transaction             │
│ 3. Execute queries               │
│ 4. Commit/rollback               │
│ 5. Return normalized data        │
└──────────────┬───────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    ┌────────┐  ┌─────────────────┐
    │ Models │  │ Sequelize       │
    │(Proxy) │  │ Transactions    │
    ├────────┤  ├─────────────────┤
    │Rfps    │  │ BEGIN           │
    │RfpItems│  │ INSERT/UPDATE   │
    │Vendors │  │ COMMIT/ROLLBACK │
    │etc.    │  └─────────────────┘
    └────────┘         │
        │              │
        └──────┬───────┘
               │
               ▼
        ┌─────────────────┐
        │  PostgreSQL     │
        │  AWS RDS        │
        └─────────────────┘
```

### Async Email Flow (Non-Blocking Pattern)

```
┌──────────────────────────────────────────────────┐
│  User clicks "Award Proposal"                    │
│  Frontend calls: api('AwardProposal', {...})     │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │  Backend awardProposalService()  │
    └────────────────┬─────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────────────┐  ┌─────────────────────────┐
│   SYNCHRONOUS            │  │   ASYNCHRONOUS          │
│   (In Transaction)       │  │   (queued with          │
│                          │  │    setImmediate())      │
├──────────────────────────┤  ├─────────────────────────┤
│ 1. Mark as awarded       │  │ 1. Send award email     │
│ 2. Auto-reject others    │  │    to winner            │
│ 3. Update RFP status     │  │                         │
│ 4. COMMIT transaction    │  │ 2. Send rejection       │
│                          │  │    emails with          │
│ ✓ Return 200 response   │  │    concurrency: 5       │
│   immediately            │  │                         │
└──────────────┬───────────┘  │ 3. Update vendor        │
               │              │    rating               │
               │              │                         │
               │              │ (Errors logged,         │
               │              │  don't block response)  │
               │              │                         │
               ▼              ▼
        ┌────────────────────────────────┐
        │  Frontend receives response    │
        │  { statusCode: 200, ... }      │
        │  (Emails sent in background)   │
        └────────────────────────────────┘
```

### Concurrent Proposal Parsing Flow

```
┌──────────────────────────────────────────────────┐
│  User calls: api('ParseProposals', {rfp_id})     │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────────┐
    │  Backend: parseProposalsService()      │
    │  Load RFP + Inbound emails for RFP     │
    └────────────────┬───────────────────────┘
                     │
                     ▼
    ┌────────────────────────────────────────┐
    │  Group emails by vendor                │
    │  Pick latest email per vendor          │
    │  Create pairs: [{email, vendor}, ...]  │
    └────────────────┬───────────────────────┘
                     │
                     ▼
    ┌────────────────────────────────────────┐
    │  processWithConcurrency()              │
    │  Max concurrent: 5                     │
    └────────────────┬───────────────────────┘
                     │
      ┌──────────────┼──────────────┬──────────────┐
      │              │              │              │
      ▼              ▼              ▼              ▼
  ┌─────┐       ┌─────┐       ┌─────┐       ┌─────┐
  │ W1  │       │ W2  │       │ W3  │       │ W4  │
  └──┬──┘       └──┬──┘       └──┬──┘       └──┬──┘
     │             │             │             │
     ▼             ▼             ▼             ▼
  ┌───────────────────────────────────────────────┐
  │ parseProposalWithGroq({rfp, email, vendor})   │
  │ Groq API Call (llama-3.3-70b-versatile)       │
  │ Extract: price, delivery_days, warranty, ...  │
  │ Compute: ai_score (0-100)                     │
  ├───────────────────────────────────────────────┤
  │ (If Vendor A fails, continue with B, C, ...)  │
  │ (No cascading failures)                       │
  └───────────────────────────────────────────────┘
     │             │             │             │
     └─────┬───────┴──────┬──────┴──────┬──────┘
           │              │              │
           ▼              ▼              ▼
        Parsed         Parsed         Parsed
     Proposal 1    Proposal 2     Proposal 3
     (ai_score:87) (ai_score:72)  (ai_score:91)
           │              │              │
           └──────┬───────┴──────┬───────┘
                  │              │
                  ▼              ▼
           ┌──────────────────────────────┐
           │  DB Transaction (short)      │
           │  Upsert proposals            │
           │  Create ProposalItems        │
           │  COMMIT                      │
           └──────────────────────────────┘
                  │
                  ▼
           ┌──────────────────────────────┐
           │  Return ranked proposals     │
           │  Sorted by ai_score desc     │
           └──────────────────────────────┘
```

### Error Handling Flow

```
┌─────────────────────────────────────────────────┐
│              Incoming Request                   │
└────────────┬────────────────────────────────────┘
             │
             ▼
      ┌──────────────┐
      │  Validation? │
      └──┬────────┬──┘
         │        │
      YES│        │NO
         ▼        │
   ┌──────────┐   │
   │ Zod Fail │   │
   │ Error    │   │
   └────┬─────┘   │
        │         │
        │         ▼
        │     ┌──────────────┐
        │     │  DB Query?   │
        │     └──┬────────┬──┘
        │        │        │
        │     YES│        │NO
        │        ▼        │
        │   ┌──────────┐   │
        │   │ DB Error │   │
        │   │ Rollback │   │
        │   │ Tx       │   │
        │   └────┬─────┘   │
        │        │         │
        │        │         ▼
        │        │    ┌──────────────┐
        │        │    │  Business    │
        │        │    │  Logic Error │
        │        │    │  e.g. "RFP   │
        │        │    │  not found"  │
        │        │    └────┬─────────┘
        │        │         │
        └────────┼─────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │  mapZodErrors() or   │
        │  errorResponse()     │
        └──────┬───────────────┘
               │
               ▼
        ┌──────────────────────┐
        │  { statusCode: 400,  │
        │    success: false,   │
        │    error: {          │
        │      code: "...",    │
        │      message: "..."  │
        │    }                 │
        │  }                   │
        └──────┬───────────────┘
               │
               ▼
        ┌──────────────────────┐
        │  Global Error        │
        │  Handler Catches     │
        │  Unhandled Errors    │
        │  Returns 500         │
        └──────────────────────┘
```

### Lazy Model Loading (Proxy Pattern)

```
┌──────────────────────────────────────────┐
│  const models = getModels(dbName)        │
└──────────────┬───────────────────────────┘
               │
               ▼
        ┌──────────────────┐
        │ Check modelCache │
        │ [dbName exists?] │
        └─┬────────────┬───┘
          │            │
       YES│            │NO
          │            │
          ▼            ▼
      ┌───────┐   ┌────────────────────┐
      │Return │   │ Create Sequelize   │
      │Cached │   │ for this dbName    │
      │Models │   │                    │
      └───────┘   └─────┬──────────────┘
                         │
                         ▼
                  ┌──────────────────┐
                  │ Return Proxy     │
                  │ Object           │
                  └─────┬────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ┌────────┐      ┌────────┐      ┌────────┐
   │models. │      │models. │      │models. │
   │ Rfps   │      │Vendors │      │Proposals
   └──┬─────┘      └──┬─────┘      └──┬─────┘
      │               │               │
   [Proxy Intercept - Lazy Load Models on First Access]
      │               │               │
      ▼               ▼               ▼
   ┌────────┐      ┌────────┐      ┌────────┐
   │ Rfps   │      │ Vendors│      │Proposal│
   │Loaded& │      │Loaded& │      │Loaded& │
   │Cached  │      │Cached  │      │Cached  │
   └────────┘      └────────┘      └────────┘
        │               │               │
        └───────┬───────┴───────┬───────┘
                │               │
                ▼               ▼
           ┌──────────────────────────────┐
           │  All subsequent accesses     │
           │  return from cache           │
           │  (No re-initialization)      │
           └──────────────────────────────┘
```

### Code Flow Examples

#### Example 1: Create RFP

**Frontend Call**:
```javascript
// frontend/src/lib/api.ts
const response = await api('CreateRfp', {
  prompt: "I need 50 office chairs...",
  structured: { title: "...", items: [...] }
});
```

**Backend Flow**:
1. **Route**: `POST /api` receives `{ action: 'CreateRfp', data: {...} }`
2. **Controller** (`rfpController.js`):
   - Validates with `createRfpSchema` (Zod)
   - Calls `createRfpService(validatedData)`
3. **Service** (`rfpService.js`):
   - Loads models: `const { Rfps, RfpItems } = getModels(dbName)`
   - Models initialize lazily on first access via Proxy
   - Starts transaction: `const t = await sequelize.transaction()`
   - Creates RFP: `await Rfps.create({ title, summary, ... }, { transaction: t })`
   - Bulk inserts items: `await RfpItems.bulkCreate([...], { transaction: t })`
   - Commits transaction: `await t.commit()`
   - Returns: `{ rfp_id, message, structured }`
4. **Controller Response**:
   ```json
   {
     "statusCode": 201,
     "success": true,
     "message": "RFP created",
     "data": { "rfp_id": "uuid", "message": "RFP created" }
   }
   ```

#### Example 2: Parse Proposals (with Concurrency & AI)

**Frontend Call**:
```javascript
const response = await api('ParseProposals', { rfp_id: 'uuid' });
```

**Backend Flow**:
1. **Controller**: Validates rfp_id, calls `parseProposalsService`
2. **Service** (`proposalService.js`):
   - Loads RFP, validates it exists
   - Fetches inbound emails for RFP
   - Groups emails by vendor (picks latest per vendor)
   - **Concurrency Step**: Calls Groq AI with 5 concurrent requests:
     ```javascript
     await processWithConcurrency(emailVendorPairs, 5, async ({ email, vendor }) => {
       const parsed = await parseProposalWithGroq({ rfp, email, vendor });
       // Individual failures don't block others
     });
     ```
   - AI extracts: price, delivery_days, warranty, items, match status, ai_score
   - Short DB transaction for upsert (create or update proposals)
   - Returns parsed proposals array
3. **Result**: Each proposal has `ai_score`, `total_price`, `status: "pending"`, items

#### Example 3: Award Proposal (with Multi-Step + Async Emails)

**Frontend Call**:
```javascript
const response = await api('AwardProposal', { rfp_id: 'uuid', vendor_id: 'uuid' });
```

**Backend Flow**:
1. **Controller**: Validates, calls `awardProposalService`
2. **Service** (`proposalService.js`):
   - **Step 1 (DB Transaction)**:
     - Marks proposal as "awarded"
     - Finds and auto-rejects other proposals
     - Updates RFP status to "closed"
     - Commits transaction (API can return now)
   - **Step 2 (Async - Non-Blocking)**:
     - `setImmediate()` queues email operations
     - **Award Email**: Send to winning vendor asynchronously
     - **Rejection Emails**: Send to other vendors with 5 concurrent sends via `processWithConcurrency()`
     - **Vendor Rating Update**: Call `updateVendorOnAward()` asynchronously
     - All errors logged but don't affect response
3. **Immediate Response**:
   ```json
   {
     "statusCode": 200,
     "data": { "rfp_id": "uuid", "vendor_id": "uuid", "awarded_proposal_id": "uuid" }
   }
   ```
4. **Meanwhile (Background)**:
   - Award email sent to vendor A
   - Rejection emails sent to vendors B, C (concurrent)
   - Vendor A rating updated (success_rate++, avg_score updated)
   - Vendors B, C rejection_count incremented

### Error Handling

**Validation Error** (Zod fails):
```javascript
// In controller
try {
  const validated = createRfpSchema.parse(data.data);
} catch (err) {
  const mapped = mapZodErrors(err);
  return errorResponse(400, mapped);
  // Response: { statusCode: 400, success: false, error: { field: "message" } }
}
```

**Service Error** (DB failure, business logic):
```javascript
// In service
try {
  const rfp = await Rfps.findOne({ where: { id: rfp_id } });
  if (!rfp) return { error: "RFP not found" };
  // Controller checks: if (result?.error) return errorResponse(400, result.error)
} catch (error) {
  await t.rollback(); // rollback transaction
  throw error; // global error handler catches
}
```

**Global Error Handler** (express app.js):
```javascript
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  return res.status(status).json({
    statusCode: status,
    success: false,
    error: { code: err.code || 'INTERNAL_ERROR', message: err.message }
  });
});
```

### Key Design Patterns

1. **Lazy Model Loading**: Models initialized only on first access via Proxy, cached per dbName
2. **Transactional Writes**: DB state changes wrapped in transactions; rollback on error
3. **Async Non-Blocking**: Email sends queued with `setImmediate()` after commit; API returns immediately
4. **Bounded Concurrency**: Email sends limited to 5 concurrent to avoid rate limits
5. **Zod Validation**: All inputs validated at controller; error details mapped to client
6. **Consistent Response Format**: All responses follow `{ statusCode, success, message, data/error }`
7. **Error Isolation**: Individual failures (email send, proposal parse) don't block batch operations
