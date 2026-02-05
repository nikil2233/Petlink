# PetLink Verification System Implementation Plan

## Objective

To ensure the authenticity of Vets, Rescuers, and Shelters on the platform by implementing a document-based verification system.

## 1. Database & Storage Changes

### Schema Updates (`profiles` table)

We will add fields to track verification status and store proof documents.

- `is_verified` (BOOLEAN):
  - **Default:** `FALSE` for Vets, Rescuers, Shelters.
  - **Default:** `TRUE` for regular Pet Owners (optional, or FALSE if we want strictness, but usually Pet Owners are trusted defaults).
- `verification_status` (TEXT): Enum-like values: `'pending'`, `'submitted'`, `'approved'`, `'rejected'`.
- `verification_document_url` (TEXT): Path to the uploaded ID/License file.

### Storage Bucket

- **Bucket Name:** `verification-docs`
- **Privacy:** Private (Authenticated access only).
- **Policies:**
  - Users can upload to their own folder.
  - Only Admins can view all files (for manual verification).

## 2. User Workflow (Frontend)

### A. Post-Registration Flow

1.  **Immediate Access:** Users can still log in immediately after signup.
2.  **Dashboard Restrictions:**
    - When a Vet/Rescuer logs in, if `is_verified` is FALSE, they see a prominent **"Action Required: Verify Your Account"** banner.
    - Key features (e.g., appearing in search results) are disabled until verified.

### B. Verification Page

A new route `/verify-account` containing:

- Instructions: "Please upload your SLVC Registration or National ID."
- File Upload: Validates image/PDF.
- Submit Status: Updates `verification_status` to `'submitted'` and saves the file URL.

### C. Public Views (Safety Filters)

- **Find Vet Page:** Update the fetch query to strictly filter `role = 'vet' AND is_verified = TRUE`.
- **Rescuer Alerts:** Only send SMS/Notifications to verified rescuers.

## 3. Implementation Steps (Technical)

1.  **Step 1: SQL Migration**
    - Run SQL to alter `profiles` table.
    - Create Storage Bucket and Policies.
2.  **Step 2: Build Verification UI**
    - Create `VerificationUpload` component.
    - Add Banner to `Dashboard`.
3.  **Step 3: Enforce Logic**
    - Modify `FindVet.jsx` and `NotifyRescuer.jsx` queries.

## 4. Admin Workflow (MVP)

- **Short Term:** The Admin (You) checks the Supabase Dashboard, views the file, and manually toggles `is_verified` to `TRUE`.
- **Long Term:** Build a dedicated `/admin` page to view pending requests lists.

## Next Action

Shall we proceed with **Step 1: SQL Migration**?
