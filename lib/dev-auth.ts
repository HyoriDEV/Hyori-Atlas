export { DEV_TEST_USERS, type DevTestUser } from "@/prisma/seeds/dev-users";

export function isDevAuthEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return process.env.ALLOW_DEV_AUTH === "true";
  }
  return process.env.ALLOW_DEV_AUTH !== "false";
}
