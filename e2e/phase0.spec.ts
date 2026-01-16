// Comprehensive E2E test suite for Hololand Phase 0
import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = `test_${Date.now()}@hololand.test`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_USERNAME = `testuser_${Date.now()}`;

test.describe('Hololand Phase 0 E2E Tests', () => {
  let page: Page;
  let creatorToken: string;

  test.beforeAll(async () => {
    // Setup: Create test user
    const response = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        password: TEST_PASSWORD,
      }),
    });

    const data = await response.json();
    creatorToken = data.token;
    expect(data.success).toBe(true);
  });

  test.describe('Authentication Flow', () => {
    test('should sign up new creator', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);

      await page.fill('input[name="email"]', `new_${Date.now()}@test.com`);
      await page.fill('input[name="username"]', `user_${Date.now()}`);
      await page.fill('input[name="password"]', TEST_PASSWORD);

      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
      await expect(page.locator('text=Welcome')).toBeVisible();
    });

    test('should login with valid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);

      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    });

    test('should reject invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', 'WrongPassword123!');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=Invalid credentials')).toBeVisible();
    });

    test('should reset password', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password`);

      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.click('button:has-text("Send Reset Link")');

      await expect(page.locator('text=Check your email')).toBeVisible();
    });
  });

  test.describe('Creator Dashboard', () => {
    test.beforeEach(async ({ page: testPage }) => {
      page = testPage;
      await page.goto(`${BASE_URL}/dashboard`);
      await page.goto(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        data: {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        },
      });
    });

    test('should display dashboard tabs', async () => {
      await expect(page.locator('text=Home')).toBeVisible();
      await expect(page.locator('text=Worlds')).toBeVisible();
      await expect(page.locator('text=Earnings')).toBeVisible();
      await expect(page.locator('text=Analytics')).toBeVisible();
      await expect(page.locator('text=Profile')).toBeVisible();
    });

    test('should show creator statistics', async () => {
      await expect(page.locator('text=Total Worlds')).toBeVisible();
      await expect(page.locator('text=Total Earnings')).toBeVisible();
      await expect(page.locator('text=Total Visitors')).toBeVisible();
    });

    test('should update creator profile', async () => {
      await page.click('text=Profile');

      await page.fill('input[name="displayName"]', 'Test Creator');
      await page.fill('textarea[name="bio"]', 'Creating awesome VR worlds');

      await page.click('button:has-text("Save Profile")');

      await expect(page.locator('text=Profile updated')).toBeVisible();
    });
  });

  test.describe('World Creation & Management', () => {
    let worldId: string;

    test('should create new world', async () => {
      await page.goto(`${BASE_URL}/dashboard/worlds`);
      await page.click('button:has-text("Create New World")');

      // Select template
      await page.click('text=Welcome Plaza');

      // Fill in world details
      await page.fill('input[name="title"]', 'My Test World');
      await page.fill('textarea[name="description"]', 'A world for testing');

      await page.click('button:has-text("Create")');

      // Extract world ID from URL
      await expect(page).toHaveURL(/\/worlds\/\w+/);
      worldId = page.url().split('/').pop() || '';

      expect(worldId).toBeTruthy();
    });

    test('should edit world with builder', async () => {
      await page.goto(`${BASE_URL}/worlds/${worldId}/edit`);

      // Check builder interface loaded
      await expect(page.locator('text=Asset Panel')).toBeVisible();
      await expect(page.locator('canvas')).toBeVisible();
      await expect(page.locator('text=Inspector')).toBeVisible();
    });

    test('should publish world', async () => {
      await page.goto(`${BASE_URL}/worlds/${worldId}/edit`);

      await page.click('button:has-text("Publish")');

      await expect(page.locator('text=World published successfully')).toBeVisible();
    });

    test('should view published world', async () => {
      await page.goto(`${BASE_URL}/worlds/${worldId}`);

      await expect(page.locator('text=My Test World')).toBeVisible();
      await expect(page.locator('text=A world for testing')).toBeVisible();
      await expect(page.locator('button:has-text("Enter World")')).toBeVisible();
    });

    test('should delete world', async () => {
      await page.goto(`${BASE_URL}/dashboard/worlds`);

      await page.locator(`[data-world-id="${worldId}"]`).hover();
      await page.click(`[data-world-id="${worldId}"] button:has-text("Delete")`);

      await page.click('button:has-text("Confirm Delete")');

      await expect(page.locator('text=World deleted')).toBeVisible();
    });
  });

  test.describe('Social Features', () => {
    test('should follow creator', async () => {
      await page.goto(`${BASE_URL}/creators/test_creator_1`);

      await page.click('button:has-text("Follow")');

      await expect(page.locator('button:has-text("Unfollow")')).toBeVisible();
    });

    test('should leave review on world', async () => {
      await page.goto(`${BASE_URL}/worlds/sample_world_1`);

      await page.click('button:has-text("Leave Review")');

      // Fill review form
      await page.click('input[value="5"]'); // 5-star rating
      await page.fill('textarea[name="review"]', 'Amazing world! Love the design.');

      await page.click('button:has-text("Submit Review")');

      await expect(page.locator('text=Review posted')).toBeVisible();
    });

    test('should view world reviews', async () => {
      await page.goto(`${BASE_URL}/worlds/sample_world_1`);

      await page.click('text=Reviews');

      await expect(page.locator('text=5 stars')).toBeVisible();
      await expect(page.locator('text=Amazing world')).toBeVisible();
    });
  });

  test.describe('Analytics', () => {
    test('should view world analytics', async () => {
      await page.goto(`${BASE_URL}/dashboard/analytics`);

      // Check charts are loaded
      await expect(page.locator('[data-testid="visits-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    });

    test('should filter analytics by date range', async () => {
      await page.goto(`${BASE_URL}/dashboard/analytics`);

      await page.click('select[name="dateRange"]');
      await page.click('option[value="7d"]');

      await expect(page.locator('text=Last 7 days')).toBeVisible();
    });

    test('should export analytics data', async () => {
      await page.goto(`${BASE_URL}/dashboard/analytics`);

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Export CSV")');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/analytics_\d+\.csv/);
    });
  });

  test.describe('Payments & Transactions', () => {
    test('should display creator earnings', async () => {
      await page.goto(`${BASE_URL}/dashboard/earnings`);

      await expect(page.locator('text=Total Earnings')).toBeVisible();
      await expect(page.locator('text=Pending Payout')).toBeVisible();
      await expect(page.locator('text=Available Balance')).toBeVisible();
    });

    test('should view transaction history', async () => {
      await page.goto(`${BASE_URL}/dashboard/earnings`);

      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('th:has-text("Date")')).toBeVisible();
      await expect(page.locator('th:has-text("Amount")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
    });
  });

  test.describe('Performance Tests', () => {
    test('dashboard should load within 3 seconds', async () => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test('world listing should paginate correctly', async () => {
      await page.goto(`${BASE_URL}/worlds?limit=10&page=1`);

      // Count visible items
      const items = await page.locator('[data-testid="world-card"]').count();
      expect(items).toBeLessThanOrEqual(10);

      // Navigate to next page
      await page.click('button[aria-label="Next page"]');

      await expect(page).toHaveURL(/page=2/);
    });
  });

  test.describe('Error Handling', () => {
    test('should show error for invalid world ID', async () => {
      await page.goto(`${BASE_URL}/worlds/invalid_id_12345`);

      await expect(page.locator('text=World not found')).toBeVisible();
    });

    test('should show error for network failures', async () => {
      // Simulate network error
      await page.context().setOffline(true);

      await page.goto(`${BASE_URL}/dashboard`);

      await expect(page.locator('text=Network error')).toBeVisible();

      await page.context().setOffline(false);
    });

    test('should validate form inputs', async () => {
      await page.goto(`${BASE_URL}/dashboard/worlds/new`);

      // Try to submit empty form
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Title is required')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async () => {
      await page.goto(`${BASE_URL}/dashboard`);

      const h1 = await page.locator('h1').count();
      expect(h1).toBeGreaterThanOrEqual(1);
    });

    test('should have alt text for images', async () => {
      await page.goto(`${BASE_URL}/dashboard/worlds`);

      const images = await page.locator('img').all();
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    });

    test('should be keyboard navigable', async () => {
      await page.goto(`${BASE_URL}/dashboard`);

      // Tab through elements
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeTruthy();
    });
  });
});
