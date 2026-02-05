describe('Adoption Center', () => {
  it('should allow browsing and filtering pets without login', () => {
    cy.visit('/adopt');
    cy.contains('Find Your New').should('be.visible');

    // Test Search Filter
    const invalidSearch = 'Unicorn_' + Date.now();
    cy.get('input[placeholder*="Search"]').type(invalidSearch);
    cy.contains('Filter').click();
    
    // Should show no results
    cy.contains('No pets found').should('be.visible');

    // Reset
    cy.get('input[placeholder*="Search"]').clear();
    cy.contains('Filter').click();
    
    // Should show results (grid exists)
    cy.get('.grid').should('exist');
  });

  it('should restrict "List a Pet" to logged in users', () => {
    cy.visit('/adopt');
    cy.contains('List a Pet').click();
    
    // Should show Access Denied or Login Prompt
    cy.contains('Partner Access Only').should('be.visible');
  });
});
