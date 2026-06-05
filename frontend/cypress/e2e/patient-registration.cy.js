describe('Patient Registration Workflow', () => {
  it('should successfully register a new patient', () => {
    cy.visit('/login')
    cy.get('#email').type('admin@clinic.com')
    cy.get('#password').type('password123')
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/dashboard')
    cy.get('#new-patient-btn').click()
    cy.get('#patient-name').type('John Doe')
    cy.get('#submit-registration').click()
    cy.contains('Patient registered successfully').should('be.visible')
  })
})
