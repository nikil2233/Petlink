// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
// ***********************************************

Cypress.Commands.add('login', (email, password) => {
  cy.visit('/auth');
  
  // Ensure we are on login form (if there is a toggle)
  // Assuming default state or checking UI text
  cy.contains('Welcome Back').should('be.visible');

  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  
  cy.get('button[type="submit"]').click();

  // Wait for redirect to home or dashboard
  cy.url().should('not.include', '/auth');
  cy.location('pathname').should('eq', '/');
});
