import './commands'

// Prevent Cypress from crashing on uncaught exceptions from the application
// This is common with React 18+ strict mode or rapid navigation in tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  return false
})
