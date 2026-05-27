import { test, expect } from '@playwright/test';

test.describe('Homepage Sanity', () => {

  test('Contact form is visible', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#contact')).toBeVisible();
  });

  test('"Book now" button is visible for every listed room', async ({ page }) => {
    await page.goto('/');

    const roomCards = page.locator('.room-card');
    await expect(roomCards.first()).toBeVisible();

    const cards = await roomCards.all();
    for (const card of cards) {
      await expect(card.getByRole('link', { name: 'Book now' })).toBeVisible();
    }
  });

});
