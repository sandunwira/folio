"use server";

import { redirect } from "next/navigation";
import { checkLogin, countAdmins, countUsers, createSession, createUser, destroySession, deleteUser, getSettings, getSessionUser, getUserByUsername, getUserById, listEvents, logEvent, setSettings } from "@/lib/auth";

const usernamePattern = /^[a-z0-9_.-]{2,32}$/;

function loginErrorPath(message) {
	return `/login?error=${encodeURIComponent(message)}`;
}

export async function setupAdminAction(formData) {
	const name = String(formData.get("name") ?? "").trim();
	const username = String(formData.get("username") ?? "").trim().toLowerCase();
	const password = String(formData.get("password") ?? "");
	const confirm = String(formData.get("confirm") ?? "");

	if (!name) redirect(loginErrorPath("Please enter your name."));
	if (!usernamePattern.test(username)) redirect(loginErrorPath("Username must be 2-32 characters (a-z, 0-9, _ . -)."));
	if (password.length < 6) redirect(loginErrorPath("Password must be at least 6 characters."));
	if (password !== confirm) redirect(loginErrorPath("Passwords do not match."));
	if (countUsers() > 0) redirect(loginErrorPath("Administrator already exists. Please sign in."));

	const user = createUser({ username, displayName: name, password, isAdmin: true });
	logEvent("admin_bootstrapped", username, "First admin account created");
	await createSession(user.id, sessionLifetimeDays());
	redirect("/");
}

export async function loginAction(formData) {
	const username = String(formData.get("username") ?? "").trim().toLowerCase();
	const password = String(formData.get("password") ?? "");
	if (!username || !password) redirect(loginErrorPath("Please fill in both fields."));
	const user = checkLogin(username, password);
	if (!user) {
		logEvent("login_failed", username, "Failed sign-in attempt");
		redirect(loginErrorPath("Incorrect username or password."));
	}
	logEvent("login_success", username, "Signed in");
	await createSession(user.id, sessionLifetimeDays());
	redirect("/");
}

function sessionLifetimeDays() {
	const days = Number(getSettings().session_days);
	return Number.isInteger(days) && days >= 1 && days <= 365 ? days : 30;
}

export async function logoutAction() {
	const session = await getSessionUser();
	await destroySession();
	if (session) logEvent("logout", session.username, "Signed out");
	redirect("/login");
}

export async function createUserAction(formData) {
	const session = await getSessionUser();
	if (!session?.isAdmin) redirect("/");
	const name = String(formData.get("name") ?? "").trim();
	const username = String(formData.get("username") ?? "").trim().toLowerCase();
	const password = String(formData.get("password") ?? "");
	const makeAdmin = formData.get("admin") === "on";

	const failPath = (message) => `/dashboard/users?error=${encodeURIComponent(message)}`;
	if (!name) redirect(failPath("Please enter a display name."));
	if (!usernamePattern.test(username)) redirect(failPath("Username must be 2-32 characters (a-z, 0-9, _ . -)."));
	if (password.length < 6) redirect(failPath("Password must be at least 6 characters."));
	if (getUserByUsername(username)) redirect(failPath(`Username "${username}" is already taken.`));

	createUser({ username, displayName: name, password, isAdmin: makeAdmin });
	logEvent("account_created", session.username, `Created account "${username}"${makeAdmin ? " with admin role" : ""}`);
	redirect("/dashboard/users");
}

export async function deleteUserAction(formData) {
	const session = await getSessionUser();
	if (!session?.isAdmin) redirect("/");
	const id = Number(formData.get("id"));
	const target = id ? getUserById(id) : null;
	if (!target || target.id === session.id) redirect("/dashboard/users");
	if (target.is_admin && countAdmins() <= 1) redirect("/dashboard/users");
	const deletedUsername = target.username;
	deleteUser(target.id);
	logEvent("account_deleted", session.username, `Deleted account "${deletedUsername}"`);
	redirect("/dashboard/users");
}

export async function updateAdminSettingsAction(formData) {
	const session = await getSessionUser();
	if (!session?.isAdmin) redirect("/");
	const appName = String(formData.get("appName") ?? "").trim();
	const maintenance = formData.get("maintenance") === "on";
	const sessionDays = Number(formData.get("sessionDays"));
	const quotaGb = Number(formData.get("quotaGb"));
	const usedGb = Number(formData.get("usedGb"));

	const failPath = (message) => `/settings?error=${encodeURIComponent(message)}`;
	if (!appName) redirect(failPath("App name can't be empty."));
	if (appName.length > 40) redirect(failPath("App name must be 40 characters or fewer."));
	if (!Number.isInteger(sessionDays) || sessionDays < 1 || sessionDays > 365) redirect(failPath("Session lifetime must be between 1 and 365 days."));
	if (!Number.isFinite(quotaGb) || quotaGb < 1) redirect(failPath("Storage quota must be at least 1 GB."));
	if (!Number.isFinite(usedGb) || usedGb < 0) redirect(failPath("Storage used can't be negative."));
	if (usedGb > quotaGb) redirect(failPath("Storage used can't exceed the quota."));

	setSettings({ app_name: appName, maintenance: maintenance ? "on" : "off", session_days: String(sessionDays), quota_gb: String(quotaGb), used_gb: String(usedGb) });
	logEvent("settings_updated", session.username, maintenance ? "Site settings updated (maintenance on)" : "Site settings updated");
	redirect("/settings?saved=1");
}
