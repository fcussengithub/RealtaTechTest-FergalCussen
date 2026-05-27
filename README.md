# Shady Meadows B&B — SDET Technical Challenge

**Author:** Fergal Cussen — fcussen333@yahoo.co.uk

## Part 1: Karate API Tests

### Prerequisites
- Java 21 (exactly — Karate 1.4.1 is not compatible with Java 22+)
- Maven 3.8+

### Running the tests

```bash
cd karate
mvn test
```

### Viewing the report

After the run, Karate generates an HTML report at:

```
karate/target/karate-reports/karate-summary.html
```

Open it in any browser. It contains a summary table plus per-scenario step-by-step detail.

### What is tested

| Feature file | Endpoint | Key assertions |
|---|---|---|
| `branding.feature` | `GET /branding/` | `name` equals `"Shady Meadows B&B"`; `contact.email` matches email regex |
| `rooms.feature` | `GET /room/` | Response contains a non-empty `rooms` array; each room has `roomPrice > 0` |
| `booking.feature` | `POST /booking/` | Fetches a live `roomid` first; creates a booking and asserts `bookingid` is returned |

### Running via VS Code tasks

Open the Command Palette (`Ctrl+Shift+P`) and choose **Tasks: Run Task**, or use the menu **Terminal → Run Task**. The following Karate tasks are available:

| Task label | What it does |
|---|---|
| `Karate: Run All API Tests` | Runs the full suite (`mvn test`) — also the default build task (`Ctrl+Shift+B`) |
| `Karate: Run branding.feature` | Runs only the branding scenario |
| `Karate: Run rooms.feature` | Runs only the rooms scenario |
| `Karate: Run booking.feature` | Runs only the booking scenario |

---

## Part 2: Playwright UI Tests

### Prerequisites
- Node.js 18+

### Setup

```bash
cd playwright
npm install
npx playwright install chromium
```

### Running the tests

```bash
# Headless (default)
npm test

# Headed (watch the browser)
npm run test:headed

# Debug mode (Playwright Inspector)
npm run test:debug
```

### Viewing the report

```bash
npm run test:report
```

This opens the HTML report in your browser (`playwright-report/index.html`). Each test shows timeline, screenshots on failure, and video on failure.

### What is tested

| Test file | Journey | Key assertions |
|---|---|---|
| `homepage.spec.ts` | Homepage Sanity | Contact form section is visible; every room card has a visible "Book now" link |
| `admin.spec.ts` | Admin Login | Login with `admin`/`password` succeeds; you are redirected to the Dashboard/Inboxes view; Logout button is present |
| `admin.spec.ts` | Rooms Tab (Bonus) | First room card scraped from the homepage is found in the admin panel; clicking it opens a detail view whose type, price, description, and features match what was shown on the homepage |

### Running via VS Code tasks

Open the Command Palette (`Ctrl+Shift+P`) and choose **Tasks: Run Task**, or use the menu **Terminal → Run Task**. The following Playwright tasks are available:

| Task label | What it does |
|---|---|
| `Playwright: Install Dependencies` | Runs `npm install` and installs the Chromium browser |
| `Playwright: Run All UI Tests` | Runs the full suite headless |
| `Playwright: Run homepage.spec.ts` | Runs only the homepage tests headless |
| `Playwright: Run admin.spec.ts` | Runs only the admin tests headless |
| `Playwright: Run All UI Tests (Headed)` | Runs the full suite with a visible browser |
| `Playwright: Run homepage.spec.ts (Headed)` | Runs only the homepage tests headed |
| `Playwright: Run admin.spec.ts (Headed)` | Runs only the admin tests headed |
| `Playwright: Open HTML Report` | Opens the last generated HTML report in the browser |

---

## Approach

**Karate (API layer)**

- A single `karate-config.js` sets `baseUrl` so feature files are environment-agnostic.
- Tests are kept "atomic": `booking.feature` calls `GET /room/` itself to obtain a valid `roomid` rather than hard-coding one, so it survives periodic data resets.
- Karate's fuzzy matchers (`#number`, `#array`, `#regex`) are used throughout so the tests are resilient to value changes while still verifying schema and business rules.

**Playwright (UI layer)**

- User-facing locators (`getByRole`, `getByTestId`, `getByLabel`) are preferred over CSS/XPath, as recommended by the challenge brief. However, there are still places where I had to use CSS.
- The bonus test, 'click the first room listing, navigate to the room, and verify that room details match homepage' scrapes the public homepage room cards as ground-truth data, then verifies the admin panel listing and detail view reflect the same type, price, description, and features — a cross-UI consistency check with no hard-coded values.
- `retries: 1` is set in the Playwright config to tolerate thing like network interruptions.

---

## Bugs / Observations

1. **Periodic data reset** - as the platform resets all bookings and contacts on a schedule, I wrote the tests in this suite to either create their own data or read only the stable catalogue (rooms, branding).

2. **Admin panel** — the bonus UI test 'Click the first room listing, navigate to the room, and verify that room details match homepage' will fail when run. This is an intentional failure. The reason for this is the description is truncated when you click into a room page on the admin panel.

3. **`POST /booking/` accepts overlapping dates** — the API does not currently reject a booking whose dates overlap with an existing booking for the same room. This is a functional bug: a guest could overbook a room. A test demonstrating this could be added.

4. **Homepage test** - one requirement was "[v]erify that the "Book this room" buttons are present for the listed room types". The actual text on the webpage is "Book now", not "Book this room". I assumed this to be an inaccuracy in the test rather than a bug.

---

## CI/CD Integration

Both suites can be run from a single Jenkins Pipeline job. Required plugins: **Pipeline**, **Git**, **JUnit**, **HTML Publisher**, and **NodeJS** (with a Node.js 20+ installation configured under *Manage Jenkins → Global Tool Configuration*). For full Jenkins setup walkthroughs see the [Karate](https://dev.to/khushi_singla/seamless-api-test-automation-integrating-karate-framework-with-jenkins-1onb) and [Playwright](https://medium.com/@sangitaaryans/integrating-playwright-with-jenkins-for-automated-testing-in-ci-cd-86567978cae7) tutorials.

```groovy
pipeline {
    agent any
    tools {
        maven 'Maven'
        jdk 'OpenJDK-21'
        nodejs 'Node20'
    }
    stages {
        stage('Karate API Tests') {
            steps {
                dir('karate') {
                    sh 'mvn test -Dtest=TestRunner'
                }
            }
        }
        stage('Playwright UI Tests') {
            steps {
                dir('playwright') {
                    sh 'npm ci'
                    sh 'npx playwright install --with-deps chromium'
                    sh 'npm test'
                }
            }
        }
    }
    post {
        always {
            junit 'karate/target/surefire-reports/*.xml'
            junit 'playwright/test-results/results.xml'
            publishHTML(target: [
                reportDir:   'karate/target/karate-reports',
                reportFiles: 'karate-summary.html',
                reportName:  'Karate Report'
            ])
            publishHTML(target: [
                reportDir:   'playwright/playwright-report',
                reportFiles: 'index.html',
                reportName:  'Playwright Report'
            ])
        }
    }
}
```
