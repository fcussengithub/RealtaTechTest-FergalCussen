Feature: Branding API Verification

  Background:
    * url baseUrl

  Scenario: GET /branding/ returns the correct B&B name
    Given path 'branding'
    When method GET
    Then status 200
    And match response.name == 'Shady Meadows B&B'
    And match response.contact.email == '#regex [a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}'
