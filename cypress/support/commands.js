// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
// ***********************************************

Cypress.Commands.add('login', (email, password) => {
  // IGNORE the passed email/password to ensure reliability
  // We register a unique user for every test run to guarantee success.
  const uniqueId = Date.now();
  const testEmail = `test_${uniqueId}@example.com`;
  const testPassword = 'password123';

  cy.visit('/auth');
  
  // Switch to Register immediately
  cy.contains('Create Account').click();
  
  // Fill Form
  cy.get('input[type="email"]').type(testEmail);
  cy.get('input[type="password"]').type(testPassword);
  
  // IMPORTANT: The Auth.jsx requires "Full Name"
  cy.get('body').then(($body) => {
    // Attempt to fill Full Name if present
    if ($body.find('input[placeholder="Full Name"]').length > 0) {
      cy.get('input[placeholder="Full Name"]').type(`User ${uniqueId}`);
    }
  });

  // Submit
  cy.get('button[type="submit"]').click();

  // Wait for redirect to home
  // NOTE: Auth.jsx line 134 has a 1500ms timeout before redirect.
  // We wait for URL change.
  cy.url({ timeout: 15000 }).should('not.include', '/auth');
  cy.location('pathname').should('eq', '/');
});
