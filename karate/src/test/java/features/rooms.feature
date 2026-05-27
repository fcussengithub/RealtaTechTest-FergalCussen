Feature: Room Inventory API

  Background:
    * url baseUrl
    Given path 'auth/login'
    And header Content-Type = 'application/json'
    And request { username: 'admin', password: 'password' }
    When method POST
    Then status 200
    * def authToken = response.token

  Scenario: GET /room returns an array with at least one room priced above zero
    Given path 'room'
    And header Cookie = 'token=' + authToken
    When method GET
    Then status 200
    And match response.rooms == '#array'
    * def priced = karate.filter(response.rooms, function(r){ return r.roomPrice > 0 })
    * match priced == '#[_ > 0]'
