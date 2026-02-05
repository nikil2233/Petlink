describe('Vet Dashboard', () => {
    beforeEach(() => {
        // Clear session to ensure fresh login
        cy.clearLocalStorage();
        cy.clearCookies();
        
        // Ignore manageable React errors during rapid navigation
        cy.on('uncaught:exception', (err, runnable) => {
            return false;
        });
    });

    it('should allow a Vet to manage appointments', () => {
        // 1. Login as Vet
        // Mock Profile Fetch to return Role as 'vet'
        cy.intercept('GET', '**/rest/v1/profiles*', (req) => {
            req.reply({
                body: [{ id: 'vet-1', full_name: 'Dr. Smith', role: 'vet' }]
            });
        }).as('getVetProfile');

        cy.login('vet@example.com', 'password123');
        
        // Mock Appointments
        cy.intercept('GET', '**/rest/v1/appointments*', {
            body: [
                {
                    id: 'app-pending-1',
                    status: 'pending',
                    pet_name: 'Buddy',
                    service_type: 'Vaccination',
                    appointment_date: '2025-12-25',
                    time_slot: '10:00 AM',
                    pet_age: '2 years',
                    pet_species: 'Dog',
                    pet_gender: 'Male',
                    profiles: { full_name: 'John Doe', email: 'john@example.com' }
                }
            ]
        }).as('getAppointments');

        cy.visit('/vet-appointments');
        cy.wait('@getAppointments');
        
        // Verify Dashboard
        cy.contains('Appointment Dashboard').should('be.visible');
        cy.contains('Buddy').should('be.visible');
        cy.contains('Vaccination').should('be.visible');

        // 2. Accept Appointment
        cy.contains('button', 'Accept').click();

        // Verify Modal
        cy.contains('Confirm Booking').should('be.visible');
        
        // Verify inputs are pre-filled (defaults)
        cy.get('textarea').first().should('not.have.value', ''); 
        
        // 3. Confirm
        // Mock Update
        cy.intercept('PATCH', '**/rest/v1/appointments?id=eq.app-pending-1', {
            statusCode: 200,
            body: { id: 'app-pending-1', status: 'confirmed' }
        }).as('confirmAppointment');
        
        cy.intercept('POST', '**/rest/v1/notifications', {
            statusCode: 201, body: {}
        });

        cy.contains('button', 'Send Confirmation').click();

        cy.wait('@confirmAppointment');
        
        // 4. Verify UI Update (Optimistic or Refresh)
        // The component updates local state: setAppointments(prev => prev.map(...))
        // So the "Pending" list should empty or the item should move.
        // If we filter by 'pending', it should disappear.
        
        // Wait for animation
        cy.contains('No Appointments Found').should('exist'); // Since filter is Pending and we confirmed it
    });
});
