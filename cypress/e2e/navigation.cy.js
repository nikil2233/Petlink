describe('Navigation', () => {
  it('should load home page', () => {
    cy.visit('/');
    cy.contains('PetLink').should('be.visible'); // Navbar logo/text
  });

  it('should navigate to public pages', () => {
    cy.visit('/');
    
    cy.get('nav').contains('Adoption Center').click();
    cy.url().should('include', '/adopt');
    
    cy.get('nav').contains('Rescuer Feed').click();
    cy.url().should('include', '/rescuer-feed');
  });
  
  it('should redirect to auth when accessing protected route without session', () => {
    cy.visit('/notifications');
    
    // Expect redirect or restricted message
    cy.contains('Please log in').should('be.visible'); 
    // OR check url redirect
    // cy.url().should('include', '/auth');
  });
});
