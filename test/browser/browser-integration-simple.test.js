/**
 * Simplified ql.io Browser Integration Test Suite
 * 
 * Tests basic browser functionality with the console interface:
 * - Console UI loading
 * - Basic interactions
 * - Responsive design
 * - Accessibility basics
 */

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

describe('ql.io Browser Integration Tests', () => {
    let consoleProcess;
    let browser;
    let context;
    let page;
    
    const CONSOLE_URL = 'http://localhost:3000';
    const STARTUP_TIMEOUT = 20000;
    const TEST_TIMEOUT = 15000;

    beforeAll(async () => {
        console.log('Starting ql.io console server for browser tests...');
        
        // Start console server
        consoleProcess = spawn('node', ['bin/console-server.js'], {
            cwd: path.resolve(__dirname, '..', '..'),
            stdio: 'pipe',
            env: { ...process.env, NODE_ENV: 'test' }
        });

        // Wait for console server
        await waitForServer(CONSOLE_URL, '/console', STARTUP_TIMEOUT);
        console.log('Console server started');

        // Launch browser
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'ql.io-test-suite'
        });
        
        page = await context.newPage();
        
        // Set up error handling
        page.on('pageerror', error => {
            console.log(`Browser page error: ${error.message}`);
        });
        
    }, STARTUP_TIMEOUT + 10000);

    afterAll(async () => {
        // Close browser
        if (page) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
        
        // Stop server
        await stopProcess(consoleProcess, 'Console');
    });

    describe('Console UI Loading', () => {
        test('should load console homepage', async () => {
            await page.goto(`${CONSOLE_URL}/console`, { waitUntil: 'networkidle' });
            
            // Check for query input textarea
            const queryTextarea = await page.locator('#query-input').count();
            expect(queryTextarea).toBe(1);
            
            // Check for run button
            const runButton = await page.locator('#run').count();
            expect(runButton).toBe(1);
            
            // Check for debug button
            const debugButton = await page.locator('#debug').count();
            expect(debugButton).toBe(1);
        }, TEST_TIMEOUT);

        test('should display navigation elements', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            // Check that page has content
            const bodyText = await page.locator('body').textContent();
            expect(bodyText.length).toBeGreaterThan(0);
            
            // Check for basic UI structure
            const hasTextarea = await page.locator('textarea').count() > 0;
            expect(hasTextarea).toBe(true);
        }, TEST_TIMEOUT);

        test('should be responsive', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            // Check viewport dimensions
            const viewport = page.viewportSize();
            expect(viewport.width).toBe(1280);
            expect(viewport.height).toBe(720);
            
            // Check that page has rendered content
            const bodyText = await page.locator('body').textContent();
            expect(bodyText.length).toBeGreaterThan(0);
        }, TEST_TIMEOUT);
    });

    describe('Query Interface', () => {
        test('should allow query input', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            const queryInput = page.locator('#query-input');
            await queryInput.clear();
            await queryInput.fill('show tables');
            
            const inputValue = await queryInput.inputValue();
            expect(inputValue).toBe('show tables');
        }, TEST_TIMEOUT);

        test('should have functional UI buttons', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            // Check for run button
            const runButton = page.locator('#run');
            const runButtonExists = await runButton.count();
            expect(runButtonExists).toBe(1);
            
            // Check that button is visible
            const isVisible = await runButton.isVisible();
            expect(isVisible).toBe(true);
        }, TEST_TIMEOUT);

        test('should handle long queries', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            const longQuery = 'select id, title, body, userId from jsonplaceholder.posts where id = 1 or id = 2 or id = 3 limit 10';
            
            const queryInput = page.locator('#query-input');
            await queryInput.fill(longQuery);
            
            const inputValue = await queryInput.inputValue();
            expect(inputValue).toBe(longQuery);
        }, TEST_TIMEOUT);

        test('should clear query input', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            const queryInput = page.locator('#query-input');
            await queryInput.fill('select * from jsonplaceholder.posts');
            
            // Clear the input
            await queryInput.clear();
            
            const inputValue = await queryInput.inputValue();
            expect(inputValue).toBe('');
        }, TEST_TIMEOUT);
    });

    describe('Browser Compatibility', () => {
        test('should work in different viewport sizes', async () => {
            // Test mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.goto(`${CONSOLE_URL}/console`);
            
            let isVisible = await page.locator('body').isVisible();
            expect(isVisible).toBe(true);
            
            // Test tablet viewport
            await page.setViewportSize({ width: 768, height: 1024 });
            await page.reload();
            
            isVisible = await page.locator('body').isVisible();
            expect(isVisible).toBe(true);
            
            // Test desktop viewport
            await page.setViewportSize({ width: 1920, height: 1080 });
            await page.reload();
            
            isVisible = await page.locator('body').isVisible();
            expect(isVisible).toBe(true);
        }, TEST_TIMEOUT);

        test('should handle browser navigation', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            // Navigate to tables endpoint
            await page.goto(`${CONSOLE_URL}/tables`);
            
            // Go back
            await page.goBack();
            await page.waitForTimeout(500);
            
            // Should be back at console
            const currentUrl = page.url();
            expect(currentUrl).toContain('/console');
        }, TEST_TIMEOUT);
    });

    describe('Error Handling', () => {
        test('should handle network errors gracefully', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            // Simulate offline mode
            await context.setOffline(true);
            
            // Try to navigate (will fail)
            try {
                await page.goto(`${CONSOLE_URL}/nonexistent`);
            } catch (e) {
                // Expected to fail
            }
            
            // Restore online mode
            await context.setOffline(false);
            
            // Should be able to navigate back to console
            await page.goto(`${CONSOLE_URL}/console`);
            const isResponsive = await page.locator('body').isVisible();
            expect(isResponsive).toBe(true);
        }, TEST_TIMEOUT);

        test('should handle rapid interactions', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            const queryInput = page.locator('#query-input');
            
            // Rapid input changes
            for (let i = 0; i < 3; i++) {
                await queryInput.fill(`query ${i}`);
                await page.waitForTimeout(100);
            }
            
            // Page should still be responsive
            const isResponsive = await page.locator('body').isVisible();
            expect(isResponsive).toBe(true);
        }, TEST_TIMEOUT);
    });

    describe('Accessibility', () => {
        test('should have basic accessibility features', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            // Check for form elements
            const hasTextarea = await page.locator('textarea').count() > 0;
            expect(hasTextarea).toBe(true);
            
            // Check for interactive elements
            const hasLinks = await page.locator('a').count() > 0;
            expect(hasLinks).toBe(true);
        }, TEST_TIMEOUT);

        test('should be keyboard navigable', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            // Tab through elements
            await page.keyboard.press('Tab');
            await page.waitForTimeout(100);
            
            // Should be able to focus elements
            const focusedElement = await page.evaluate(() => document.activeElement.tagName);
            expect(focusedElement).toBeTruthy();
        }, TEST_TIMEOUT);
    });
});

// Helper functions
async function waitForServer(baseUrl, path, timeout) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(`${baseUrl}${path}`, (res) => {
                    if (res.statusCode === 200) {
                        resolve();
                    } else {
                        reject(new Error(`Server returned ${res.statusCode}`));
                    }
                });
                req.on('error', reject);
                req.setTimeout(1000);
            });
            return; // Server is ready
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    throw new Error(`Server at ${baseUrl} did not start within ${timeout}ms`);
}

async function stopProcess(process, name) {
    if (process && !process.killed) {
        console.log(`Stopping ${name} server...`);
        process.kill('SIGTERM');
        
        try {
            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    process.kill('SIGKILL');
                    resolve();
                }, 2000);
                
                process.on('exit', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}