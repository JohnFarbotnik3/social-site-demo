import type { Locator, Page } from "@playwright/test";
import { expect } from '@playwright/test';
import { TestUser } from './test_users';
import { ROUTES } from "./routes";

// https://playwright.dev/docs/pom
export class POM {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
		this.nav_dd_button	= page.locator("nav .dd_button");
		this.nav_log_in		= page.locator("nav").getByText("Sign in");
		this.nav_log_out	= page.locator("nav").getByText("Log out");
	}

	// ============================================================
	// basic functions.
	// ------------------------------------------------------------

	async goto(path: string) {
		await this.page.goto(path);
	}

	// ============================================================
	// locators.
	// ------------------------------------------------------------

	// navbar.
	readonly nav_dd_button	: Locator;
	readonly nav_log_in		: Locator;
	readonly nav_log_out	: Locator;

	// ============================================================
	// account management.
	// ------------------------------------------------------------

	async is_logged_in(user: TestUser): Promise<boolean> {
		return (await this.nav_dd_button.textContent()) === user.nickname;
	}

	async is_logged_out(): Promise<boolean> {
		return this.nav_log_in.isVisible();
	}

	async assert_is_logged_in(user: TestUser) {
		await expect(this.nav_dd_button).toContainText(user.nickname);
	}

	async assert_is_logged_out() {
		await expect(this.nav_log_in).toBeVisible();
	}

	async goto_login_page() {
		await this.nav_log_in.click();
		await expect(this.page).toHaveURL(ROUTES.login);
	}

	async goto_profile_page() {
		await this.page.locator("nav").getByText("Profile").click();
		await expect(this.page).toHaveURL(ROUTES.profile);
	}

	async logout() {
		await expect(this.nav_dd_button).toBeVisible();
		await this.nav_dd_button.click();
		await expect(this.nav_log_out).toBeVisible();
		await this.nav_log_out.click();
	}

	async login(user:TestUser) {
		const page = this.page;
		await this.goto_login_page();

		const input_username = page.getByRole("textbox", { name:"username" });
		const input_password = page.getByRole("textbox", { name:"password" });

		// populate inputs, then log in.
		await input_username.fill(user.username);
		await input_password.fill(user.password);
		await page.getByText('Log in').click();

		// check that user has arrived at correct page after login.
		await expect(page).toHaveURL(ROUTES.profile);

		// verify user has logged in.
		await this.assert_is_logged_in(user);
	}

	async login_cycle(user:TestUser) {
		await this.logout();
		await this.login(user);
	}

	// ============================================================
	// blogs.
	// ------------------------------------------------------------

	async goto_posts_page() {
		await this.page.locator("nav").getByText("My Posts").click();
		await expect(this.page).toHaveURL(ROUTES.posts);
	}

	async get_blog_posts() {
		await expect(this.page.locator(".posts_area")).toBeVisible();
		return this.page.locator(".posts_area .body").allInnerTexts();
	}

	// ============================================================
	// friends.
	// ------------------------------------------------------------

	async goto_search_page() {
		await this.page.locator("nav").getByText("Search").click();
		await expect(this.page).toHaveURL(ROUTES.search);
	}

	async goto_friends_page() {
		await this.page.locator("nav").getByText("Friends").click();
		await expect(this.page).toHaveURL(ROUTES.friends);
	}



};


