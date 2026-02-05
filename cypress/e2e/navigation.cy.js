describe('Navigation', () => {
  it('should load home page', () => {
    cy.visit('/');
    cy.contains('PetLink').should('be.visible'); // Navbar logo/text
  });

  it('should navigate to public pages', () => {
    cy.visit('/');
    
    cy.get('nav').contains('Adopt').click();
    cy.url().should('include', '/adopt');
    
    // Note: Rescuer Feed might be hidden or renamed, checking 'Succes' or other visible nav
    cy.get('nav').contains('Success').click();
    cy.url().should('include', '/success-stories');
  });
  
  it('should redirect to auth when accessing protected route without session', () => {
    cy.visit('/notifications');
    
    // Expect redirect or restricted message
    cy.contains('Please log in').should('be.visible'); 
    // OR check url redirect
    // cy.url().should('include', '/auth');
  });
});
