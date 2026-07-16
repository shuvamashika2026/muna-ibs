/**
 * Static verification for user data isolation patterns in source code.
 * Run: node scripts/run-user-isolation-verification.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");
const errors = [];
const checks = [];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(name, condition, detail) {
  checks.push(name);
  if (!condition) {
    errors.push(`${name}: ${detail}`);
  }
}

const files = walk(root);
const allSource = files.map((file) => ({ file, content: read(file) }));

assert(
  "SaveEntryButton forces authenticated user_id last",
  read(join(root, "components", "save-entry-button.tsx")).includes("user_id: userData.user.id"),
  "SaveEntryButton must append authenticated user_id"
);

assert(
  "useUserSession hook exists",
  read(join(root, "lib", "auth", "use-user-session.ts")).includes("onAuthStateChange"),
  "Auth lifecycle hook missing"
);

assert(
  "Dashboard removes hardcoded Shuvam default",
  !read(join(root, "app", "dashboard", "page.tsx")).includes('userName: "Shuvam"'),
  "Dashboard still hardcodes demo user name"
);

assert(
  "Trigger analysis removes demo rows",
  !read(join(root, "app", "trigger-analysis", "page.tsx")).includes("Milk tea"),
  "Trigger analysis still uses demo foods"
);

assert(
  "Weekly report removes hardcoded 18 meals",
  !read(join(root, "app", "weekly-report", "page.tsx")).includes(">18<"),
  "Weekly report still hardcodes meal count"
);

for (const { file, content } of allSource) {
  if (!file.includes(`${join("app", "")}`)) continue;

  if (/\.from\(["']users["']\)/.test(content) && content.includes('.eq("id", user.id)')) {
    continue;
  }

  if (/\.from\(["']profiles["']\)/.test(content) && content.includes("user_id")) {
    continue;
  }

  if (/\.from\(["'](meals|symptoms|bowel_movements|water_logs|sleep_logs|medication_reminders|trigger_foods)["']\)/.test(content)) {
    assert(
      `User filter in ${file.replace(process.cwd(), "")}`,
      content.includes('.eq("user_id", user.id)') || content.includes(".eq('user_id', user.id)"),
      "Personal table query missing .eq(user_id, user.id)"
    );
  }
}

assert(
  "RLS migration file exists",
  readFileSync(
    join(process.cwd(), "supabase", "migrations", "20260716180000_user_data_isolation_rls.sql"),
    "utf8"
  ).includes("auth.uid() = user_id"),
  "RLS migration missing"
);

const result = {
  passed: checks.length - errors.length,
  failed: errors.length,
  errors,
};

console.log(JSON.stringify(result, null, 2));
process.exit(errors.length > 0 ? 1 : 0);
