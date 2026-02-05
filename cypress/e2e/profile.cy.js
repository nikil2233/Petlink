describe('Profile Management', () => {
  const testUser = {
    name: 'Profile Tester',
    email: `profile_test_${Date.now()}@example.com`,
    password: 'password123'
  };

  before(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Quick Registration
    cy.visit('/auth');
    cy.contains('Create Account').click();
    cy.get('input[type="email"]').type(testUser.email);
    cy.get('input[type="password"]').type(testUser.password);
    cy.get('input[placeholder="Full Name"]').type(testUser.name);
    cy.get('button[type="submit"]').contains('Create Account').click();
    cy.url({ timeout: 10000 }).should('not.include', '/auth');
  });

  it('should allow user to update their bio', () => {
    cy.visit('/profile');
    cy.contains(testUser.name).should('be.visible');

    const newBio = 'This is an automated test bio.';
    cy.get('textarea[name="about"]').clear().type(newBio);
    cy.contains('Save Changes').click();

    cy.contains('Profile updated successfully').should('be.visible');
    
    // Reload to verify persistence
    cy.reload();
    cy.contains(newBio).should('be.visible');
  });
});
