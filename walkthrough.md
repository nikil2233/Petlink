# Verification: Vet Registration & Booking Flow

This walkthrough guides you through verifying the integrated Vet experience, from registration to appointment booking.

## Prerequisites

- Ensure you have run the `final_schema.sql` in Supabase.
- Ensure the dev server is running (`npm run dev`).

## Step 1: Register as a Vet

1.  Open the application in your browser.
2.  Navigate to the **Sign Up** / **Register** page (if logged in, log out first).
3.  Fill in the details:
    - **Email**: Use a test email (e.g., `vet@example.com`).
    - **Role**: Select **Vet/Clinic** button.
    - **Location**: Enter text location (e.g., "Colombo").
4.  Click **Create Account**.
5.  You should be redirected to the Home page.

## Step 2: Update Vet Profile & Location

1.  Click on the **Profile Icon** in the navbar.
2.  Verify the banner says "Manage your account settings as a **Veterinarian**".
3.  Scroll down to the **Exact Location on Map** section.
4.  Click a point on the map to set your clinic's precise location.
5.  Click **Save Changes**.

## Step 3: Verify Vet Listing (As a User)

1.  **Log Out** of the Vet account.
2.  **Register/Log In** as a normal "User" / "Adopter".
3.  Navigate to **Book Appointment**.
4.  Select **Sterilization** or **Vaccination**.
5.  Fill in the Pet Details and Medical Info (Steps 2 & 3).
6.  **Step 4: Select a Clinic**:
    - You should see your newly registered Vet/Clinic in the list.
    - The location/address you entered should be visible on the card.

## Implementation Details

- **Registration**: `Auth.jsx` saves selected role correctly.
- **Profile**: `Profile.jsx` uses `MapPicker` to save `latitude` and `longitude` to the database.
- **Booking**: `BookAppointment.jsx` fetches all profiles where `role = 'vet'` to populate the clinic selection list.

## Recent Fixes

- **Vet Registration**: Switched from `insert` to `upsert` in `Auth.jsx` to prevent database trigger conflicts that were defaulting new users to the 'Citizen' role. This ensures that when you select "Vet", you actually become a Vet.
- **IMPORTANT**: You must run `fix_profile_trigger.sql` in your Supabase SQL Editor. This updates the database trigger to respect the role you select during sign-up. Without this, the database might still force the "Citizen" role.
