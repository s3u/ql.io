/**
 * Global setup for browser integration tests
 * Installs Playwright browsers if needed
 */

const { chromium } = require('playwright');

module.exports = async () => {
    console.log('Setting up browser integration tests...');
    
    // Ensure browsers are installed
    try {
        const browser = await chromium.launch();
        await browser.close();
        console.log('✅ Playwright browsers ready');
    } catch (error) {
        console.log('⚠️  Installing Playwright browsers...');
        // In CI/CD, browsers should be pre-installed
        // For local development, user should run: npx playwright install
        throw new Error('Playwright browsers not installed. Run: npx playwright install');
    }
};