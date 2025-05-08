import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	/*
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	},
	*/

	testDir: 'e2e',

	// https://playwright.dev/docs/browsers#codegen-with-custom-setup
	projects: [
		{
			// NOTE - to fix "Error: page.goto: net::ERR_CERT_AUTHORITY_INVALID", see:
			// https://stackoverflow.com/questions/68219072/playwright-not-accepting-https-urls-while-openinign-with-codegen-command
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], ignoreHTTPSErrors:true },
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'], ignoreHTTPSErrors:true },
		},
	],

	use: {
		// https://playwright.dev/docs/test-timeouts
		actionTimeout		: 3 * 1000,
		navigationTimeout	: 10 * 1000,
	},

	// https://playwright.dev/docs/test-retries
	retries: 3,
});
