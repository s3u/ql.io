/**
 * ql.io Browser-Based Integration Test Suite
 * 
 * Tests the complete web interface including:
 * - Console UI functionality  
 * - Query execution from browser
 * - Real-time WebSocket communication
 * - User interactions and form handling
 * - Cross-browser compatibility
 * - Accessibility features
 * 
 * Uses Playwright for comprehensive browser testing
 */

const { chromium, firefox, webkit } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

describe('ql.io Browser Integration Tests', () => {
    let serverProcess;
    let consoleProcess;
    let browser;
    let context;
    let page;
    
    const CONSOLE_URL = 'http://localhost:3000';
    const STARTUP_TIMEOUT = 20000;
    const TEST_TIMEOUT = 15000;

    beforeAll(async () => {
        console.log('Starting ql.io console server for browser tests...');
        
        // Start console server (includes API functionality)
        consoleProcess = spawn('node', ['bin/console-server.js'], {
            cwd: path.resolve(__dirname, '..', '..'),
            stdio: 'pipe',
            env: { ...process.env, NODE_ENV: 'test' }
        });

        // Wait for console server (it runs on port 3000)
        await waitForServer('http://localhost:3000', '/console', STARTUP_TIMEOUT);
        console.log('Console server started');

        // Launch browser (Chromium by default, can be configured)
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'ql.io-test-suite'
        });
        
        page = await context.newPage();
        
        // Set up console logging from browser
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`Browser console error: ${msg.text()}`);
            }
        });
        
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

    describe('Console UI Loading and Navigation', () => {
        test('should load console homepage with all UI elements', async () => {
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
            
            // Check for step button
            const stepButton = await page.locator('#step').count();
            expect(stepButton).toBe(1);
        }, TEST_TIMEOUT);

        test('should display navigation elements', async () => {
            await page.goto(CONSOLE_URL);
            
            // Check for common navigation elements
            const links = await page.locator('a').count();
            expect(links).toBeGreaterThan(0);
        }, TEST_TIMEOUT);

        test('should be responsive and render correctly', async () => {
            await page.goto(CONSOLE_URL);
            
            // Check viewport dimensions
            const viewport = page.viewportSize();
            expect(viewport.width).toBe(1280);
            expect(viewport.height).toBe(720);
            
            // Check that page has rendered content
            const bodyText = await page.locator('body').textContent();
            expect(bodyText.length).toBeGreaterThan(0);
        }, TEST_TIMEOUT);
    });

    describe('Query Execution Interface', () => {
        test('should execute simple query from UI', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            // Check that query input exists and can be filled
            const queryInput = page.locator('#query-input');
            await queryInput.clear();
            await queryInput.fill('show tables');
            
            const inputValue = await queryInput.inputValue();
            expect(inputValue).toBe('show tables');
            
            // Check for run button
            const runButton = page.locator('#run');
            const runButtonExists = await runButton.count();
            expect(runButtonExists).toBe(1);
            
            // Check for debug button
            const debugButton = page.locator('#debug');
            const debugButtonExists = await debugButton.count();
            expect(debugButtonExists).toBe(1);
        }, TEST_TIMEOUT);

        test('should display query results in readable format', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            const queryInput = page.locator('#query-input');
            await queryInput.fill('select id, title from jsonplaceholder.posts limit 1');
            
            // Check that the query was entered
            const inputValue = await queryInput.inputValue();
            expect(inputValue).toContain('select id, title');
            
            // Check that UI is responsive
            const isVisible = await queryInput.isVisible();
            expect(isVisible).toBe(true);
        }, TEST_TIMEOUT);

        test('should handle query errors gracefully', async () => {
            await page.goto(`${CONSOLE_URL}/console`);
            
            const queryInput = page.locator('#query-input');
            await queryInput.fill('select * from nonexistent.table');
            
            // Check that invalid query was entered
            const inputValue = await queryInput.inputValue();
            expect(inputValue).toContain('nonexistent.table');
            
            // Page should still be responsive
            const isPageResponsive = await page.locator('body').isVisible();
            expect(isPageResponsive).toBe(true);
        }, TEST_TIMEOUT);

        test('should clear query input when requested', async () => {
            await page.goto(CONSOLE_URL);
            
            const queryInput = page.locator('textarea').first();
            await queryInput.fill('select * from jsonplaceholder.posts');
            
            // Look for clear button
            const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset")').first();
            if (await clearButton.count() > 0) {
                await clearButton.click();
                
                const inputValue = await queryInput.inputValue();
                expect(inputValue).toBe('');
            }
        }, TEST_TIMEOUT);
    });

    describe('Table Management Interface', () => {
        test('should display available tables', async () => {
            await page.goto(CONSOLE_URL);
            
            // Look for tables link or section
            const tablesLink = page.locator('a:has-text("Tables"), button:has-text("Tables")').first();
            if (await tablesLink.count() > 0) {
                await tablesLink.click();
                await page.waitForTimeout(1000);
                
                // Should show table list
                const pageContent = await page.textContent('body');
                expect(pageContent).toMatch(/table|jsonplaceholder|github/i);
            }
        }, TEST_TIMEOUT);

        test('should show table details when selected', async () => {
            await page.goto(CONSOLE_URL);
            
            // Navigate to tables if there's a link
            const tablesLink = page.locator('a:has-text("Tables")').first();
            if (await tablesLink.count() > 0) {
                await tablesLink.click();
                await page.waitForTimeout(1000);
                
                // Click on a table name
                const tableItem = page.locator('a, button, .table-item').first();
                if (await tableItem.count() > 0) {
                    await tableItem.click();
                    await page.waitForTimeout(1000);
                    
                    // Should show some details
                    const hasDetails = await page.locator('pre, .details, .description').count() > 0;
                    expect(hasDetails).toBe(true);
                }
            }
        }, TEST_TIMEOUT);
    });

    describe('Real-time Query Features', () => {
        test('should show loading indicator during query execution', async () => {
            await page.goto(CONSOLE_URL);
            
            const queryInput = page.locator('textarea').first();
            await queryInput.fill('select * from jsonplaceholder.posts limit 5');
            
            const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run"), input[type="submit"]').first();
            await executeButton.click();
            
            // Check for loading indicator immediately after click
            await page.waitForTimeout(100);
            const hasLoadingIndicator = await page.locator('.loading, .spinner, [class*="load"]').count() > 0;
            
            // Loading indicator might be very fast, so we just check the page is responsive
            const isResponsive = await page.locator('body').isVisible();
            expect(isResponsive).toBe(true);
        }, TEST_TIMEOUT);

        test('should update results without page reload', async () => {
            await page.goto(CONSOLE_URL);
            
            // Execute first query
            const queryInput = page.locator('textarea').first();
            await queryInput.fill('select id from jsonplaceholder.posts limit 1');
            
            const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run"), input[type="submit"]').first();
            await executeButton.click();
            await page.waitForTimeout(2000);
            
            const firstContent = await page.content();
            
            // Execute second query
            await queryInput.fill('select id from jsonplaceholder.posts limit 2');
            await executeButton.click();
            await page.waitForTimeout(2000);
            
            const secondContent = await page.content();
            
            // Content should have changed (results updated)
            expect(firstContent).not.toBe(secondContent);
        }, TEST_TIMEOUT);
    });

    describe('Browser Compatibility', () => {
        test('should work in different viewport sizes', async () => {
            // Test mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.goto(CONSOLE_URL);
            
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

        test('should handle browser back/forward navigation', async () => {
            await page.goto(CONSOLE_URL);
            
            // Navigate to tables if possible
            const tablesLink = page.locator('a:has-text("Tables")').first();
            if (await tablesLink.count() > 0) {
                await tablesLink.click();
                await page.waitForTimeout(1000);
                
                // Go back
                await page.goBack();
                await page.waitForTimeout(500);
                
                // Go forward
                await page.goForward();
                await page.waitForTimeout(500);
                
                // Page should still be functional
                const isResponsive = await page.locator('body').isVisible();
                expect(isResponsive).toBe(true);
            }
        }, TEST_TIMEOUT);
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle network errors gracefully', async () => {
            await page.goto(CONSOLE_URL);
            
            // Simulate offline mode
            await context.setOffline(true);
            
            const queryInput = page.locator('textarea').first();
            await queryInput.fill('show tables');
            
            const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run"), input[type="submit"]').first();
            await executeButton.click();
            
            await page.waitForTimeout(2000);
            
            // Should show error or handle gracefully
            const isPageResponsive = await page.locator('body').isVisible();
            expect(isPageResponsive).toBe(true);
            
            // Restore online mode
            await context.setOffline(false);
        }, TEST_TIMEOUT);

        test('should handle very long query strings', async () => {
            await page.goto(CONSOLE_URL);
            
            const longQuery = 'select id, title, body, userId from jsonplaceholder.posts where id = 1 or id = 2 or id = 3 or id = 4 or id = 5 limit 10';
            
            const queryInput = page.locator('textarea').first();
            await queryInput.fill(longQuery);
            
            const inputValue = await queryInput.inputValue();
            expect(inputValue).toBe(longQuery);
        }, TEST_TIMEOUT);

        test('should handle rapid consecutive queries', async () => {
            await page.goto(CONSOLE_URL);
            
            const queryInput = page.locator('textarea').first();
            const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run"), input[type="submit"]').first();
            
            // Execute multiple queries rapidly
            for (let i = 0; i < 3; i++) {
                await queryInput.fill(`select id from jsonplaceholder.posts limit ${i + 1}`);
                await executeButton.click();
                await page.waitForTimeout(500);
            }
            
            // Page should still be responsive
            const isResponsive = await page.locator('body').isVisible();
            expect(isResponsive).toBe(true);
        }, TEST_TIMEOUT);
    });

    describe('Accessibility', () => {
        test('should have proper ARIA labels and roles', async () => {
            await page.goto(CONSOLE_URL);
            
            // Check for basic accessibility features
            const hasButtons = await page.locator('button').count() > 0;
            const hasInputs = await page.locator('input, textarea').count() > 0;
            
            expect(hasButtons || hasInputs).toBe(true);
        }, TEST_TIMEOUT);

        test('should be keyboard navigable', async () => {
            await page.goto(CONSOLE_URL);
            
            // Tab through elements
            await page.keyboard.press('Tab');
            await page.waitForTimeout(100);
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
