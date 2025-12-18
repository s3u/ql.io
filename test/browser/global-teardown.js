/**
 * Global teardown for browser integration tests
 * Cleanup any global resources
 */

module.exports = async () => {
    console.log('Cleaning up browser integration tests...');
    
    // Force cleanup any hanging processes
    if (global.browserTestProcesses) {
        global.browserTestProcesses.forEach(process => {
            if (process && !process.killed) {
                process.kill('SIGKILL');
            }
        });
    }
    
    console.log('✅ Browser test cleanup completed');
};