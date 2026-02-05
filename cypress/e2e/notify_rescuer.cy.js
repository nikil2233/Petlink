describe('Notify Rescuer', () => {
    beforeEach(() => {
        // Mock Rescuers List (Relaxed URL matching)
        cy.intercept('GET', '**/rest/v1/profiles*role=in*', {
            statusCode: 200,
            body: [
                { id: 'rescuer-1', full_name: 'City Paws Rescue', role: 'rescuer', location: 'Downtown' },
                { id: 'rescuer-2', full_name: 'Animal Haven', role: 'shelter', location: 'Northside' }
            ]
        }).as('getRescuers');
    });

    it('should show restricted access details for non-users', () => {
        // If not logged in
        cy.visit('/notify');
        cy.contains('Welcome to PetLink').should('be.visible');
        cy.contains('Login / Sign Up').should('be.visible');
    });

    it('should allow submitting a report', () => {
        cy.login('testuser@example.com', 'password123'); // Regular user role
        cy.visit('/notify');

        // Verify Rescuers loaded
        cy.wait('@getRescuers');

        // Click "Submit Report" if tab isn't already active (default is active)
        cy.contains('Submit Report').should('be.visible');

        // Select Urgency
        cy.contains('button', 'High').click();

        // Select Rescuer
        cy.get('select').select('rescuer-1');

        // Location Info
        cy.get('input[placeholder*="Add address details"]').type('Near Central Park Entrance');
        
        // Mock Geocoding if map is clicked (optional, skipping map click for simplicity if input works)
        // But the code requires: if (!coords && !locationName). We provided locationName.

        // Details
        cy.get('textarea[placeholder*="Describe the situation"]').type('Dog looks injured and scared.');

        // Mock Submission
        cy.intercept('POST', '**/rest/v1/reports*', {
            statusCode: 201,
            body: { id: 'new-report-1' }
        }).as('submitReport');

        // Submit
        cy.contains('button', 'Submit Report').click();

        // Verify Success
        cy.wait('@submitReport');
        // valid checks: either visible or existing in DOM (handling animation/clipping issues)
        cy.contains('Report submitted successfully!').should('exist');
    });

    it('should display my reports', () => {
        cy.login('testuser@example.com', 'password123');
        
        // Mock My Reports
        cy.intercept('GET', '**/rest/v1/reports*', {
            body: [
                { 
                    id: 'report-1', 
                    status: 'accepted', 
                    location: 'Old Street', 
                    description: 'Cat stuck in tree', 
                    created_at: new Date().toISOString(),
                    rescuer: { full_name: 'City Paws Rescue' }
                }
            ]
        }).as('getMyReports');

        cy.visit('/notify');
        cy.contains('My Reports').click();
        
        cy.wait('@getMyReports');
        cy.contains('Cat stuck in tree').should('be.visible');
        cy.contains('accepted').should('be.visible');
        cy.contains('City Paws Rescue').should('be.visible');
    });
});
