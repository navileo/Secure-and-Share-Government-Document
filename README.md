# Secure & Share Government Documents with Family Members

## 📌 Project Overview
Citizens often face challenges in safely storing and sharing critical documents such as mark sheets, PAN cards, passports, and medical records. Physical copies are prone to loss, damage, or misuse. This project provides a secure digital platform for storing government documents and sharing them with family members using Aadhaar-linked accounts.

##Live Demo
  - https://shareweb-c1ab0.web.app/

## 🚀 Features
- **🔑 User Management**: Register with Aadhaar-linked accounts, secure login, and MFA options.
- **🔢 Advanced OTP System**:
  - Secure random OTP generation.
  - Exactly 20-second expiration for high security.
  - 10-second notification visibility for user convenience.
- **📂 Document Management**: Upload (PDF, images), update, and soft-delete documents with audit logging.
- **🏷️ Smart Categorization**: Automatic display of document categories (Identity, Education, Medical, etc.) in the document list.
- **👤 Profile Management**: View and update personal details securely with self-healing data recovery.
- **🔗 Secure Sharing**: Share documents with family members using time-bound links or account access.
- **📜 Audit Logging**: PII-safe logging of all critical actions (uploads, shares, deletes).

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript (Modular ES6)
- **Backend/Database**: Firebase (Authentication, Firestore, Storage)
- **Logging**: `loglevel` library for client-side, Firestore for audit logs.
- **Testing**: Jest for unit testing.
- **Deployment**: Firebase Hosting.

## 📁 Project Structure
```text
/
├── public/                 # Static files for Hosting
│   ├── css/                # Stylesheets
│   ├── js/                 # Main app logic and routing
│   └── index.html          # Main entry point
├── src/                    # Source code (Modular ES6)
│   ├── auth/               # Authentication logic
│   ├── docs/               # Document management logic
│   ├── profile/            # Profile management logic
│   └── lib/                # Shared utilities (Firebase, Logger)
├── tests/                  # Unit tests
├── firebase.json           # Firebase configuration
├── firestore.rules         # Security rules for Firestore
└── storage.rules           # Security rules for Storage
```

## ⚙️ Setup & Installation

### Prerequisites
- Node.js installed.
- Firebase Account and a new project created in [Firebase Console](https://console.firebase.google.com/).

### Installation
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd secure-doc-share
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Firebase:
   - Copy your Firebase config into `src/lib/firebase.js`.
4. Run locally:
   ```bash
   npm start
   ```

## 🛠️ Implementation Details & Recent Updates

### OTP System
- **Generation**: Uses a cryptographically secure random number generator to create 6-digit OTPs.
- **Expiration**: OTPs are valid for exactly **20 seconds**. Any attempt to verify after this window will fail.
- **UI/UX**: OTP notifications are displayed at the top of the screen for exactly **10 seconds** to ensure the user has enough time to read them without cluttering the UI.

### Document Categorization
- Every uploaded document is assigned a category (e.g., PAN, Passport, Mark sheets).
- The document list now explicitly displays the full category label (e.g., "Education (Mark sheets)") next to each file for better organization.

### Firebase Optimization
- **Connection Stability**: Enabled `experimentalForceLongPolling` to resolve `net::ERR_ABORTED` connection issues in the browser.
- **Data Persistence**: Implemented `persistentLocalCache` and `persistentMultipleTabManager` to allow the application to function smoothly across multiple tabs and during offline/unstable network conditions.
- **Unified Configuration**: Standardized all Firebase imports to a single [firebase.js](file:///c:/Users/navee/OneDrive/Desktop/Secure%20and%20Share%20Government%20Document/src/lib/firebase.js) module.

### Profile & Sharing
- **Self-Healing Profile**: Added logic to recover profile data from Firebase Auth if the Firestore record is missing or incomplete.
- **Restricted Actions**: Shared documents are view-only for recipients. Edit and Delete buttons are automatically hidden for documents shared with you.

## 🔒 Security Measures
- **Aadhaar Protection**: Aadhaar numbers are never stored in plain text. Only the SHA-256 hash and the last 4 digits are stored.
- **Access Control**: Firestore and Storage rules ensure users can only access their own documents or those explicitly shared with them.
- **Audit Logs**: Every sensitive action is logged with the actor's ID and timestamp, without including PII.

## 🧪 Testing
Run unit tests using:
```bash
npm test
```

## 📝 Future Work
- OCR for automatic document categorization.
- Advanced eKYC integration.
- Role-based access control for different document types.

---
Developed as part of the Secure Document Management initiative.
