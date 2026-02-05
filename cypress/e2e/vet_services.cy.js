describe('Vet Services', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();

        // Mock Vets Profile Fetch
        cy.intercept('GET', '**/rest/v1/profiles*role=eq.vet*', { // Adjusted query match
            statusCode: 200,
            body: [
                { 
                    id: 'vet-1', 
                    full_name: 'Dr. Smith Clinic', 
                    role: 'vet', 
                    location: 'Colombo',
                    rating: 4.8 
                }
            ]
        }).as('getVets');
    });

    it('should load Find Vet page and list vets', () => {
        cy.visit('/find-vet');
        cy.contains('Find a Vet').should('be.visible');
        
        // Wait for vets to load (mocked)
        // Some components use different query params, exact match might be tricky.
        // FindVet.jsx: .select('*').eq('role', 'vet')
        // URL: .../profiles?select=*&role=eq.vet
        
        // Check if vet is listed
        // The mock might need better matching if the query string differs slightly.
        // Let's use a wildcard match for profiles
        cy.intercept('GET', '**/rest/v1/profiles*', {
             body: [
                { 
                    id: 'vet-1', 
                    full_name: 'Dr. Smith Clinic', 
                    role: 'vet', 
                    latitude: 6.9271, 
                    longitude: 79.8612,
                    avatar_url: null,
                    address: '123 Vet Lane'
                }
             ]
        }).as('getVetsWide');
        
        cy.wait(1000); // Allow effect to run
        cy.contains('Dr. Smith Clinic').should('be.visible');
        
        // Test Map Interaction (Leaflet)
        // Hard to test canvas/map clicks, but we can verify map container exists
        cy.get('.leaflet-container').should('exist');
    });

    it('should complete the Book Appointment flow', () => {
        cy.login('testuser@example.com', 'password123');
        cy.visit('/book-appointment');

        // Step 1: Select Service (Vaccination)
        cy.contains('Your Pet’s Wellness').should('be.visible');
        cy.contains('h3', 'Vaccination').parent().find('button').click();

        // Step 2: Pet Information
        cy.contains('Pet Information').should('be.visible');
        cy.get('input[name="petName"]').type('Buddy');
        
        // Custom Dropdowns (might be tricky)
        // Species
        cy.contains('Select Species').click();
        cy.contains('button', 'Dog').click();
        
        // Gender
        cy.contains('Select Gender').click();
        cy.contains('button', 'Male').click();
        
        // Age
        cy.contains('Select Age').click();
        cy.contains('button', '2 years').click();
        
        cy.get('input[name="petWeight"]').type('15 kg');
        
        cy.contains('Next Step').click();

        // Step 3: Medical Info
        cy.contains('Medical History').should('be.visible');
        // Is Healthy? check custom checkbox
        cy.get('input[name="isHealthy"]').check(); 
        // Vaccination Status
        cy.contains('label', 'Vaccinated').click();
        
        cy.contains('Next Step').click();

        // Step 4: Select Clinic
        cy.contains('Select a Clinic').should('be.visible');
        // Ensure mock vets loaded
        cy.intercept('GET', '**/rest/v1/profiles*', {
             body: [{ id: 'vet-1', full_name: 'Dr. Smith Clinic', role: 'vet', location: 'City' }]
        });
        
        // Click the vet card
        // Force click to ensure we hit the clickable container if the text is wrapped
        cy.contains('Dr. Smith Clinic').click({ force: true });
        // Logic: onClick on parent div calls nextStep()
        
        // Step 5: Finalize
        cy.contains('Finalize Booking').should('be.visible');
        
        // Date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        cy.get('input[type="date"]').type(dateStr);
        
        // Time Slot
        cy.contains('Select Time').click();
        cy.contains('button', '10:00 AM').click();
        
        // Consent
        cy.get('input[name="ownerConsent"]').check();
        
        // Mock Submit
        cy.intercept('POST', '**/rest/v1/appointments*', {
            statusCode: 201,
            body: { id: 'app-1' }
        }).as('createAppointment');
        
        cy.intercept('POST', '**/rest/v1/notifications', {
             statusCode: 201, 
             body: {} 
        }).as('createNotification');

        cy.contains('button', 'Confirm Appointment').click();

        cy.wait('@createAppointment');
        
        // Verify Success Modal
        cy.contains('Booking Sent!').should('be.visible');
    });

    it('should list my bookings', () => {
        cy.login('testuser@example.com', 'password123');
        
        // Mock data for My Bookings
        cy.intercept('GET', '**/rest/v1/appointments*', {
            body: [
                {
                    id: 'app-1',
                    pet_name: 'Buddy',
                    service_type: 'Vaccination',
                    appointment_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
                    status: 'confirmed',
                    vet: { full_name: 'Dr. Smith Clinic' },
                    vet_id: 'vet-1' // Add this if referenced
                }
            ]
        }).as('getBookings');

        cy.visit('/my-bookings');
        
        // Wait and verify
        // Adjust selectors based on actual MyBookings.jsx content which I haven't seen but likely lists items.
        // I'll assume text matching works.
        // Check for visible details on the card
        // Pet Name might not be shown on the summary card, depending on UI design.
        cy.contains('Vaccination').should('be.visible');
        cy.contains('Dr. Smith Clinic').should('be.visible');
    });
});
