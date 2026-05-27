import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/admin');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL(/\/admin/);
}

async function scrapeHomepageRooms(page: Page) {
  await page.goto('/');
  await page.locator('.card.room-card').first().waitFor();
  const roomCards = await page.locator('.card.room-card').all();
  return Promise.all(
    roomCards.map(async card => ({
      name:        (await card.getByRole('heading', { level: 5 }).textContent())?.trim(),
      type:        (await card.getByRole('heading', { level: 5 }).textContent())?.trim(),
      price:       (await card.locator('.card-footer > :not(a)').textContent())?.replace(/[^0-9]/g, ''),
      description: (await card.locator('p.card-text').textContent())?.trim(),
      features:    (await Promise.all(
        (await card.locator('div.card-text > div').all())
          .map(async el => ((await el.textContent()) ?? '').trim())
      )).filter(Boolean),
    }))
  );
}

async function scrapeAdminRoomListing(page: Page, room: { type?: string; price?: string }) {
  return page.getByTestId('roomlisting')
    .filter({ hasText: room.type ?? '' })
    .filter({ hasText: room.price ?? '' })
    .first();
}

async function getRoomDetails(page: Page) {
  const panel = page.locator('.room-details');
  await panel.waitFor();
  return panel;
}

test.describe('Admin Authentication & Dashboard', () => {

  test('Admin login redirects to admin dashboard and shows logout button', async ({ page }) => {
    await loginAsAdmin(page);

    const adminNav = page.getByRole('navigation');
    await expect(adminNav).toBeVisible();
    await expect(adminNav.getByRole('link', { name: 'Rooms' })).toBeVisible();
    await expect(adminNav.getByRole('link', { name: /Messages/ })).toBeVisible();
    await expect(adminNav.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('(Bonus) Click the first room listing, navigate to the room, and verify that room details match homepage', async ({ page }) => {
    const homepageRooms = await scrapeHomepageRooms(page);

    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await loginAsAdmin(page);

    const firstRoom = homepageRooms[0];
    const matchingRow = await scrapeAdminRoomListing(page, firstRoom);
    await expect(matchingRow).toBeVisible();
    await matchingRow.click();

    const roomDetails = await getRoomDetails(page);
    await expect(roomDetails.locator('p:has-text("Type:") span')).toHaveText(firstRoom.type ?? '');
    await expect(roomDetails.locator('p:has-text("Room price:") span')).toHaveText(firstRoom.price ?? '');
    await expect(roomDetails.locator('p:has-text("Description:") span')).toContainText(firstRoom.description ?? '');
    await expect(roomDetails.locator('p:has-text("Features:") span')).toContainText(firstRoom.features);
  });

});
