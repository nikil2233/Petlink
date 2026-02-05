describe('Lost & Found Reporting', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'Reporter User',
    email: `reporter_${timestamp}@example.com`,
    password: 'password123'
  };
  const petName = `LostPet_${timestamp}`;

  before(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Register
    cy.visit('/auth');
    cy.contains('Create Account').click();
    cy.get('input[type="email"]').type(testUser.email);
    cy.get('input[type="password"]').type(testUser.password);
    cy.get('input[placeholder="Full Name"]').type(testUser.name);
    cy.get('button[type="submit"]').contains('Create Account').click();
    cy.url({ timeout: 10000 }).should('not.include', '/auth');
  });

  it('should allow reporting a lost pet', () => {
    cy.visit('/lost-and-found');
    // Correct button text from source code analysis
    cy.contains('File a Report').click();
    cy.wait(500); // Wait for transition
    cy.contains('I Lost a Pet').should('be.visible').click();

    // Fill Form
    // Fill Form matches placeholder "Pet's Name"
    cy.get('input[placeholder="Pet\'s Name"]').type(petName);
    cy.get('input[placeholder="e.g. Golden Retriever"]').type('Test Breed');
    cy.get('input[placeholder*="Cross streets"]').type('Test Location City');
    cy.get('textarea[placeholder*="Describe any unique markings"]').type('Testing description field.');
    
    // Fill Required Date and Color
    cy.get('input[type="date"]').type(new Date().toISOString().split('T')[0]); // Today's date
    cy.get('input[placeholder*="Primary"]').type('Black');

    cy.get('input[type="tel"]').type('555-0199');

    // Submit
    cy.contains('Broadcast Lost Pet Alert').click();

    // Verify Success or Catch DB Error
    // We check for the error message first. If it appears, we fail fast with a clear message.
    cy.get('body').then(($body) => {
        if ($body.find(':contains("Structure Update Required")').length > 0) {
             throw new Error("🚨 STOP: You must run 'update_lost_pets_schema.sql' in Supabase to fix the database!");
        }
    });

    // If no error immediately, wait for success
    cy.contains('Report Broadcasted!', { timeout: 15000 }).should('be.visible');
    cy.contains('Generate Flyer').should('be.visible');
    
    // Close - logic might vary if "Generate" or "Skip" is clicked. Let's click "Skip" for test speed
    cy.contains('Skip for Now').click();
    cy.contains('Active Feed').click();
    cy.reload();
    cy.contains(petName).should('be.visible');
  });
});
