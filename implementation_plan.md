# Maritime Certificate Tracking System

A dedicated, premium web-based application designed to manage commercial ship certificates (Class, Flag, and Servicing) with an automatic alerting system, email notifications, and an office TV dashboard. The web application completely replaces the daily use of Excel for tracking certificates.

## User Review Required

> [!IMPORTANT]
> **Complete Replacement of Excel**: The web application will serve as the sole source of truth for certificate management and tracking.
> - **Initial Import**: The user can upload their existing Excel sheet (`MT_TREND_Certificate_Survey_Tracker_Updated_01052026-2.xlsx`) to populate the system database automatically for a ship.
> - **Audit Export**: To support maritime audits (an important B2B selling point), the system will support exporting the fleet data back into a beautifully colored, audit-ready Excel sheet.
> - **Visual Tracking**: All tracking, editing of dates, status updates, and visual alerts will take place directly in the web browser interface.

> [!IMPORTANT]
> **Unified Status Rules (Web UI)**:
> The Web Application will display and calculate certificate alarms in real-time according to the following thresholds:
> - **Red (Critical/Urgent/Overdue)**: $\le$ 30 days before target date or target date has passed.
> - **Yellow (Warning)**: $\le$ 90 days (3 months) and $>30$ days before target date.
> - **Green (Attention/OK)**: $\le$ 180 days (6 months) and $>90$ days before target date.
> - **Normal (Monitor)**: $>180$ days before target date.

> [!TIP]
> **Relational Database Architecture (SQLite)**: To handle multi-user access (ships, ship managers, partners) and provide a robust production-ready architecture, we will use a **relational SQL database**.
> - For local development, we will use Node.js's native **`node:sqlite`** module (which requires no external binary compiles or installations, preventing Windows environment errors).
> - The database will store data in a single file (`vessels.db`) with tables: `vessels`, `certificates`, `actionable_items`, `email_settings`, `email_logs`, and `users`.
> - This schema can be easily migrated to a cloud-based relational database (like PostgreSQL or MySQL) when you deploy the platform online for multi-party access.
> - **User Roles**: We will implement a role-based access system to demonstrate how different parties (Ship Managers, Crew on board, Partners) access the interface.

## Open Questions

1. **Email Configuration**: Do you have a preferred SMTP service or email provider (e.g., SendGrid, Gmail, Outlook) to send notifications, or should we include a local SMTP development setup (e.g., MailDev / Ethereal Email) and manual email trigger log for testing purposes?
2. **Additional Fleet Attributes**: Would you like to track extra parameters for the vessels (e.g., status, current voyage, last dry-dock date) in addition to the standard ones from the Excel (IMO, Flag, Owner, Manager)?

---

## Proposed Changes

We will build the project inside the workspace directory `c:\Users\redab\Desktop\CertificatsSurvey`.

```
workspace/
├── server.js (Express server, API routing, email cron jobs)
├── package.json (Node dependencies)
├── vessels.db (SQLite database file)
├── db.js (SQLite connection and schema definition)
├── helpers/
│   ├── excel_handler.py (Python openpyxl script for reading & formatting Excel files)
│   └── email_service.js (Nodemailer service for sending reminders)
└── public/
    ├── index.html (Main SPA container)
    ├── app.js (Frontend application logic)
    ├── styles.css (Modern, premium CSS styling with dark/light themes)
    └── assets/ (Images and icons)
```

### Backend (Node.js & Express)

#### [NEW] [package.json](file:///c:/Users/redab/Desktop/CertificatsSurvey/package.json)
- Define node dependencies: `express`, `cors`, `multer` (for Excel uploads), `nodemailer`, `node-cron` (for daily reminder checks), and configuration settings.

#### [NEW] [server.js](file:///c:/Users/redab/Desktop/CertificatsSurvey/server.js)
- Express app configuration.
- REST API Endpoints:
  - `GET /api/vessels`: Get all vessels and their status counts.
  - `POST /api/vessels`: Add a new vessel manually or upload an Excel tracker.
  - `DELETE /api/vessels/:id`: Delete a vessel.
  - `GET /api/vessels/:id/certificates`: Retrieve certificates and periodical surveys.
  - `PUT /api/vessels/:id/settings`: Save email settings (up to 3 addresses).
  - `POST /api/vessels/:id/export`: Generate and download styled Excel tracker (calls python helper).
  - `GET /api/email-logs`: Get notification history.
  - `POST /api/trigger-notifications`: Manually trigger the daily notification check.
- Daily cron job: runs at midnight to calculate certificate status shifts and send emails.

#### [NEW] [db.js](file:///c:/Users/redab/Desktop/CertificatsSurvey/db.js)
- Establishes connection to `vessels.db` using native `node:sqlite`.
- Defines and automatically executes database schema initialization (tables: `vessels`, `certificates`, `actionable_items`, `email_settings`, `email_logs`, `users`).
- Inserts dummy data for role-based users (e.g. Administrator, Captain/Crew, Auditor).

#### [NEW] [email_service.js](file:///c:/Users/redab/Desktop/CertificatsSurvey/helpers/email_service.js)
- Uses `nodemailer` to send alerts. Supports SMTP config and logs sent notifications to `email_logs` table.

#### [NEW] [excel_handler.py](file:///c:/Users/redab/Desktop/CertificatsSurvey/helpers/excel_handler.py)
- A Python CLI tool using `openpyxl`.
- Implements two actions:
  - `parse`: Reads the uploaded `.xlsx` file, extracts vessel header info, and outputs a clean JSON of certificates and surveys.
  - `format`: Takes JSON certificate updates, generates a copy of the Excel template, overwrites the Excel cells with new dates, writes updated conditional formulas in Column G, applies matching cell background formatting (fills, text color) directly to the Excel file, and saves it.

### Frontend (HTML5 / Vanilla CSS / Vanilla JS)

#### [NEW] [index.html](file:///c:/Users/redab/Desktop/CertificatsSurvey/public/index.html)
- Main single page application container.
- Includes sections: Dashboard, Fleet View, Certificate Tracker Table, Actionable Items, Email Settings, Email Logs, and Office TV Dashboard.
- Incorporates `Chart.js` via CDN for beautiful data visualization.
- Integrates Google Fonts (Inter, Outfit).

#### [NEW] [styles.css](file:///c:/Users/redab/Desktop/CertificatsSurvey/public/styles.css)
- Premium design system: glassmorphism, dark/light modes, gradients, dynamic hover states.
- Clean responsive layout using CSS Grid and Flexbox.
- Layouts optimized for standard office TV displays (Office TV Mode) with big indicators, dark high-contrast backgrounds, and high visibility.

#### [NEW] [app.js](file:///c:/Users/redab/Desktop/CertificatsSurvey/public/app.js)
- Handles SPA routing and state.
- Fetches data from REST API endpoints.
- Displays charts for vessel statistics.
- Table rendering with search, filtering (Class, Flag, Servicing), and sorting.
- Interactive dialogs for editing certificate dates and email configurations.
- Real-time TV mode loop: scrolls the critical issues list automatically and updates status.

---

## Verification Plan

### Automated Tests
- Script tests:
  - Parse the sample Excel file `MT_TREND_Certificate_Survey_Tracker_Updated_01052026-2.xlsx` using `excel_handler.py` to confirm correct extraction.
  - Test format generation with `excel_handler.py` to ensure colors are applied correctly and spreadsheet remains corrupt-free.
- Server endpoint validation using node tests or manual cURL requests.

### Manual Verification
- Start the local development server: `npm run dev` (starts node with watch flag).
- Open browser at `http://localhost:3000`.
- Upload the template file `MT_TREND_Certificate_Survey_Tracker_Updated_01052026-2.xlsx` to create a vessel.
- Verify dashboard counts, charts, and status groupings.
- Modify certificate dates to trigger status changes (OK to Green, Green to Yellow, etc.).
- Validate mock email delivery and check logs.
- Switch to "Office TV Mode" to verify layout on screen.
- Download the generated Excel file and open it (e.g. via python/libreoffice or openpyxl check) to verify conditional formatting.
