Feature: Booking Creation API

  Background:
    * url baseUrl

  Scenario: POST /booking creates a new booking and returns the required fields

    # Step 1 — resolve a valid room ID from the rooms endpoint
    Given path 'room'
    When method GET
    Then status 200
    * def roomId = response.rooms[0].roomid

    # Step 2 — submit a new booking for that room
    * def checkin = java.time.LocalDate.now().plusDays(30).toString()
    * def checkout = java.time.LocalDate.now().plusDays(35).toString()
    Given path 'booking'
    And header Content-Type = 'application/json'
    And request
      """
      {
        "roomid": #(roomId),
        "firstname": "James",
        "lastname": "Smith",
        "depositpaid": true,
        "email": "james.smith@example.com",
        "phone": "01234567890",
        "bookingdates": {
          "checkin": "#(checkin)",
          "checkout": "#(checkout)"
        }
      }
      """
    When method POST
    Then status 201
    * def bookingId = response.bookingid
    And match response.bookingid == '#number'
    And match response.roomid == roomId
    And match response.firstname == 'James'
    And match response.lastname == 'Smith'
    And match response.depositpaid == true
    And match response.bookingdates.checkin == checkin
    And match response.bookingdates.checkout == checkout

    # Cleanup — delete the booking so the scenario is re-runnable
    Given path 'auth/login'
    And header Content-Type = 'application/json'
    And request { username: 'admin', password: 'password' }
    When method POST
    Then status 200
    * def authToken = response.token

    Given path 'booking', bookingId
    And header Cookie = 'token=' + authToken
    When method DELETE
    Then status 202
