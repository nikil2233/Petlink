describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit('/auth');
  });

  it('should load the auth page', () => {
    cy.contains('Welcome Back').should('be.visible'); // Adjust depending on default state
  });

  it('should allow toggling between login and register', () => {
    // Assuming default is Login
    cy.contains('Create Account').click(); 
    cy.contains('Get Started').should('be.visible');
    
    cy.contains('Sign In').click();
    cy.contains('Welcome Back').should('be.visible');
  });

  it('should show error with invalid credentials', () => {
    const fakeEmail = `invalid_${Date.now()}@test.com`;
    cy.get('input[type="email"]').type(fakeEmail);
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();

    // Wait for loading to finish (button text changes back)
    cy.contains('Processing...', { timeout: 5000 }).should('not.exist');
    
    // Expect error message
    cy.contains('Invalid login credentials', { timeout: 10000 }).should('be.visible'); 
  });
  
  // Note: Successful login mock is difficult without backend seeding or mock server.
  // We utilize the custom command `cy.login` in other tests which could interact with Supabase auth directly or mock it.
});
