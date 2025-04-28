import { expect, type Locator, test } from '@playwright/test';
import { test_users, TestUser } from './utils/test_users';
import { POM } from "./utils/pom";
import { wait } from "./utils/promises";
import { ROUTES } from './utils/routes';

// NOTE: these test each depend on eachother, so they should run serially.
test.describe.configure({ mode: "serial" });

function get_parallel_test_user() {
	// https://playwright.dev/docs/test-parallel
	const index = Number(process.env.TEST_PARALLEL_INDEX ?? 0);
	return test_users[index];
}

test("account: login, stays logged in", async ({ page }) => {
	const pom = new POM(page);
	await pom.goto(ROUTES.root);

	const user = get_parallel_test_user();
	await pom.login(user);

	// navigate to blank page and back, verify user was automatically logged in.
	await page.goto(ROUTES.blank_page);
	await wait(100);
	await page.goto(ROUTES.profile);
	await pom.assert_is_logged_in(user);

	// ensure login remains stable during refresh as well.
	await page.reload();
	await pom.assert_is_logged_in(user);
});

test("account: delete, create", async ({ page }) => {
	const pom = new POM(page);
	await page.goto(ROUTES.root);

	const user = get_parallel_test_user();
	pom.login(user);

	// NOTE: getByLabel is generally *very* unreliable (exact=true finds nothing, while exact=false finds too many things).
	// https://stackoverflow.com/questions/75777710/playwright-page-getbylabel-resolved-to-2-elements
	const input_username = page.getByRole("textbox", { name:"username" });
	const input_password = page.getByRole("textbox", { name:"password" });
	const input_nickname = page.getByRole("textbox", { name:"nickname" });

	// delete account.
	await pom.goto_profile_page();
	await page.locator(".actions_bar").getByText("Edit").click();
	await page.locator(".actions_bar").getByText("Delete account").click();
	await input_password.fill(user.password);
	await page.getByText("Submit and delete").click();
	await pom.assert_is_logged_out();

	// create account.
	await pom.goto_login_page();
	await page.getByText("Sign up").click();
	await input_username.fill(user.username);
	await input_password.fill(user.password);
	await input_nickname.fill(user.nickname);
	await page.getByText("Submit").click();
	await pom.assert_is_logged_in(user);

});

test("account: change nickname", async ({ page }) => {
	const pom = new POM(page);
	await page.goto(ROUTES.root);

	const user = get_parallel_test_user();
	await pom.login(user);

	const input_nickname = page.getByRole("textbox", { name:"nickname" });

	// change nickname.
	const old_nickname = user.nickname;
	const new_nickname = user.nickname + "_NEW";
	await pom.goto_profile_page();
	await page.locator(".actions_bar").getByText("Edit").click();
	await input_nickname.fill(new_nickname);
	await page.getByText("Submit").click();
	const nickname_div = page.locator("label").getByText("nickname").locator("div");
	await expect(nickname_div).toHaveText(new_nickname);

	// login-cycle to verify change in backend.
	await pom.login_cycle(user);
	await pom.goto_profile_page();
	await expect(nickname_div).toHaveText(new_nickname);

	// change nickname back.
	await pom.goto_profile_page();
	await page.locator(".actions_bar").getByText("Edit").click();
	await input_nickname.fill(old_nickname);
	await page.getByText("Submit").click();
	await expect(nickname_div).toHaveText(old_nickname);
});

test("account: change username and password", async ({ page }) => {
	const pom = new POM(page);
	await page.goto(ROUTES.root);

	const user = get_parallel_test_user();
	await pom.login(user);

	const input_username_new = page.getByRole("textbox", { name:"new username" });
	const input_password_old = page.getByRole("textbox", { name:"old password" });
	const input_password_new = page.getByRole("textbox", { name:"new password" });
	const input_password_dup = page.getByRole("textbox", { name:"enter password again" });
	const username_div = page.locator("label").getByText("username").locator("div");

	const old_username = user.username;
	const new_username = user.username + "_NEW";
	const old_password = user.password;
	const new_password = user.password + "_NEW";

	// change username and password.
	await pom.goto_profile_page();
	await page.locator(".actions_bar").getByText("Edit").click();
	await page.locator(".actions_bar").getByText("Change username or password").click();
	await input_username_new.fill(new_username);
	await input_password_old.fill(old_password);
	await input_password_new.fill(new_password);
	await input_password_dup.fill(new_password);
	await page.getByText("Submit").click();
	await expect(username_div).toHaveText(new_username);

	user.username = new_username;
	user.password = new_password;

	// login-cycle to verify change in backend.
	await pom.login_cycle(user);
	await pom.goto_profile_page();
	await expect(username_div).toHaveText(new_username);

	// change username and password back.
	await pom.goto_profile_page();
	await page.locator(".actions_bar").getByText("Edit").click();
	await page.locator(".actions_bar").getByText("Change username or password").click();
	await input_username_new.fill(old_username);
	await input_password_old.fill(new_password);
	await input_password_new.fill(old_password);
	await input_password_dup.fill(old_password);
	await page.getByText("Submit").click();
	await expect(username_div).toHaveText(old_username);

	user.username = old_username;
	user.password = old_password;

});

test("blog: posts - add, edit, remove", async ({ page }) => {
	const pom = new POM(page);
	await page.goto(ROUTES.root);

	const user = get_parallel_test_user();
	await pom.login(user);

	// get list of posts.
	await pom.goto_posts_page();
	const posts = await pom.get_blog_posts();

	async function verify_posts(posts_truth) {
		let posts_seen: string[];

		// verify that new post was added to end of posts list.
		posts_seen = await pom.get_blog_posts();
		expect(posts_seen).toMatchObject(posts_truth);

		// verify change in backend.
		await pom.login_cycle(user);
		await pom.goto_posts_page();
		posts_seen = await pom.get_blog_posts();
		expect(posts_seen).toMatchObject(posts_truth);
	}

	// add post.
	const new_post = "current date: " + new Date().toISOString();
	await page.locator(".actions_bar").getByText("Add post").click();
	await page.locator(".editor_area").getByRole("textbox").fill(new_post);
	await page.locator(".editor_area").getByText("Submit").click();
	posts.push(new_post);
	await verify_posts(posts);

	// edit post.
	await expect(page.locator(".posts_area")).toBeVisible();
	const edit_post = "edit date: " + new Date().toISOString();
	const edit_buttons = await page.locator(".posts_area .edit").all();
	await edit_buttons[edit_buttons.length - 1].click();
	await page.locator(".editor_area").getByRole("textbox").fill(edit_post);
	await page.locator(".editor_area").getByText("Submit").click();
	posts[posts.length - 1] = edit_post;
	await verify_posts(posts);

	// remove post.
	await expect(page.locator(".posts_area")).toBeVisible();
	await edit_buttons[edit_buttons.length - 1].click();
	await page.locator(".editor_area").getByText("Remove").click();
	posts.pop();
	await verify_posts(posts);
});

test("friends: search, add, view-posts, chat, remove", async ({ page }) => {
	const pom = new POM(page);
	await page.goto(ROUTES.root);

	const user = get_parallel_test_user();
	await pom.login(user);

	const findex = (test_users.indexOf(user) + 1) % test_users.length;
	const friend = test_users[findex];

	// search for friend and add them.
	await pom.goto_search_page();
	await page.locator(".filters_bar input").fill(friend.username.substring(0,4));
	await wait(1000);// wait for list-debounce.
	const search_list_elems = await page.locator(".list_area .item_user").all();
	for(const elem of search_list_elems) {
		const username = await elem.locator(".username").innerText();
		if(username === friend.username) {
			await elem.locator("button").getByText("Add friend").click();
			break;
		}
	}

	// verify friend was added.
	{
	const friend_list_usernames = await page.locator(".list_area .item_user .username").allInnerTexts();
	expect(friend_list_usernames).toContain(friend.username);
	}

	async function get_friend_elem() {
		const friend_list_elems = await page.locator(".list_area .item_user").all();
		for(const elem of friend_list_elems) {
			const username = await elem.locator(".username").innerText();
			if(username === friend.username) {
				return elem;
			}
		}
		throw("failed to find friend_elem");
	}

	// view posts.
	{
	await pom.goto_friends_page();
	const friend_elem = await get_friend_elem();
	await friend_elem.getByRole("button").getByText("View Posts").click();
	await wait(200);
	const url = new URL(page.url());
	expect(url.origin + url.pathname).toBe(ROUTES.posts);
	}

	// send a chat message.
	{
	await pom.goto_friends_page();
	const friend_elem = await get_friend_elem();
	// NOTE: the center of the element is clicked by default, but that would accidentally click "Remove" button in this case.
	await friend_elem.click({ position: { x:5, y:5 }});
	const chat_area = page.locator(".chat_area");
	const post_area = chat_area.locator(".post_area");
	await expect(chat_area.locator(".header")).toBeVisible();
	await expect(chat_area.locator(".header")).toContainText(user.nickname);
	await expect(chat_area.locator(".header")).toContainText(friend.nickname);
	const new_post = "chat_message_" + Math.random() + "_" + new Date().toISOString();
	await chat_area.getByRole("textbox").fill(new_post);
	await chat_area.getByRole("button").getByText("Send").click();
	const posts = await post_area.allInnerTexts();
	let matches = 0;
	for(const post of posts) if(post.includes(new_post)) matches++;
	expect(matches).toBe(1);
	}

	// remove friend.
	{
	await pom.goto_friends_page();
	const friend_elem = await get_friend_elem();
	await friend_elem.getByRole("button").getByText("Remove").click();
	await wait(50);
	const friend_list_usernames = await page.locator(".list_area .item_user .username").allInnerTexts();
	expect(friend_list_usernames).not.toContain(friend.username);
	}
});



