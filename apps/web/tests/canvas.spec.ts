import { test, expect } from '@playwright/test';

test.describe('Skein Canvas E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    
    // Clear the canvas using the Topbar Clear button so tests start with an empty canvas
    await page.locator('text=Clear').click();
  });

  test('should load the workspace canvas and sidebar', async ({ page }) => {
    // Check brand logo is visible
    await expect(page.locator('text=Skein').first()).toBeVisible();
    
    // Check Sidebar is visible with category headers
    await expect(page.locator('h3:has-text("Triggers")')).toBeVisible();
    await expect(page.locator('h3:has-text("Actions")')).toBeVisible();
  });

  test('should allow dragging and dropping nodes onto the canvas', async ({ page }) => {
    const canvas = page.locator('.react-flow__pane');
    
    // Drag Manual Trigger onto canvas
    const manualTrigger = page.locator('text=Manual Trigger').first();
    await manualTrigger.dragTo(canvas);
    
    // Drag HTTP Request onto canvas
    const httpRequest = page.locator('text=HTTP Request').first();
    await httpRequest.dragTo(canvas);

    // Verify both nodes are rendered on the canvas
    await expect(page.locator('.react-flow__node-manual-trigger')).toHaveCount(1);
    await expect(page.locator('.react-flow__node-http-request')).toHaveCount(1);
  });

  test('should validate port connection types and show toast errors', async ({ page }) => {
    const canvas = page.locator('.react-flow__pane');
    
    // Add nodes
    await page.locator('text=Manual Trigger').first().dragTo(canvas);
    await page.locator('text=HTTP Request').first().dragTo(canvas);

    // Get incompatible handles: payload (object) -> url (string)
    const payloadHandle = page.locator('[data-handleid="payload"]').first();
    const urlHandle = page.locator('[data-handleid="url"]').first();

    // Drag to connect (incompatible connection)
    await payloadHandle.dragTo(urlHandle, { force: true });

    // Verify type validation toast error is visible
    await expect(page.locator('text=Incompatible connection')).toBeVisible();
    
    // Verify no edge was created
    await expect(page.locator('.react-flow__edge')).toHaveCount(0);
  });

  test('should connect compatible ports and persist on page reload', async ({ page }) => {
    const canvas = page.locator('.react-flow__pane');
    
    // Add nodes
    await page.locator('text=Manual Trigger').first().dragTo(canvas);
    await page.locator('text=HTTP Request').first().dragTo(canvas);

    // Get compatible handles: payload (object) -> body (object)
    const payloadHandle = page.locator('[data-handleid="payload"]').first();
    const bodyHandle = page.locator('[data-handleid="body"]').first();

    // Drag to connect (compatible connection)
    await payloadHandle.dragTo(bodyHandle, { force: true });

    // Verify edge is created
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);

    // Reload page to test persistence
    await page.reload();

    // Verify nodes and edge still exist
    await expect(page.locator('.react-flow__node-manual-trigger')).toHaveCount(1);
    await expect(page.locator('.react-flow__node-http-request')).toHaveCount(1);
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  });
});
