# Enhancement of Sterilization Booking Feature

## Goal Description

The goal is to upgrade the "Book Appointment" feature to include a detailed and structured form specifically for sterilization bookings. This includes capturing comprehensive pet details, medical history, vaccination status, and owner consent, ensuring vets have all necessary information before surgery.

## User Review Required

> [!IMPORTANT]
> This plan requires running the updated `final_schema.sql` script in Supabase to modify the `appointments` table. This will **DROP** existing data in that table.

## Proposed Changes

### Database Schema (`final_schema.sql`)

- **Modify `public.appointments` table**:
  - Add `pet_age` (text)
  - Add `pet_weight` (text)
  - Add `pet_gender` (text)
  - Add `pet_species` (text)
  - Add `procedure_type` (text) - e.g., 'Spay', 'Neuter'
  - Add `is_healthy` (boolean) - defaulted to true
  - Add `medical_conditions` (text)
  - Add `on_medication` (boolean)
  - Add `medication_details` (text)
  - Add `vaccinated` (text) - 'Vaccinated', 'Not vaccinated'
  - Add `owner_consent` (boolean)

### Frontend (`src/pages/BookAppointment.jsx`)

- **Refactor Form Logic**:
  - Implement a multi-step form sequence:
    1.  **Service Selection** (Existing)
    2.  **Pet Details**: Name, Species (Dog/Cat), Sex, Age, Weight.
    3.  **Medical Information** (If Sterilization): Health status, Conditions, Medications, Vaccination.
    4.  **Clinic Selection** (Existing)
    5.  **Date & Time** (Existing)
    6.  **Consent & Review** (New)
- **Validation**: Ensure all required fields (Pet Details, Health Info, Consent) are filled before submission.
- **Submitting**: Include all new fields in the Supabase payload.

## Verification Plan

### Manual Verification

1.  **Database Update**:
    - Run the updated `final_schema.sql` in Supabase SQL Editor.
    - Verify table structure in Supabase Dashboard.
2.  **Form Flow**:
    - Go to "Book Appointment".
    - Select "Sterilization".
    - Fill out Pet Details (Name, Age, Weight, etc.).
    - Fill out Medical Info (Check valid inputs).
    - Select Clinic, Date, Time.
    - Check "Owner Consent".
    - Submit.
    - Verify the appointment appears in "My Bookings" (if implemented) or check Supabase `appointments` table for the new record with all details correctly saved.
