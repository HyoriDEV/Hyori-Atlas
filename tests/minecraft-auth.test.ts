import "dotenv/config";
import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { RegistrationStatus, Role } from "../lib/generated/prisma/enums";
import {
  createMinecraftAuthCode,
  verifyAndLinkMinecraftAccount,
} from "../lib/services/minecraft-service";
import { POST as authRouteHandler } from "../app/api/minecraft/auth/route";
import { NextRequest } from "next/server";

describe("Minecraft Authentication & Account Linking", () => {
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;

  before(async () => {
    // Create test users
    testUser1 = await prisma.user.create({
      data: {
        discordId: `test_disc_${crypto.randomBytes(6).toString("hex")}`,
        discordUsername: "player_one",
        discordDisplayName: "Player One",
        role: Role.PLAYER,
        registrationStatus: RegistrationStatus.NEW,
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        discordId: `test_disc_${crypto.randomBytes(6).toString("hex")}`,
        discordUsername: "player_two",
        discordDisplayName: "Player Two",
        role: Role.PLAYER,
        registrationStatus: RegistrationStatus.NEW,
      },
    });

    testUser3 = await prisma.user.create({
      data: {
        discordId: `test_disc_${crypto.randomBytes(6).toString("hex")}`,
        discordUsername: "player_three",
        discordDisplayName: "Player Three",
        role: Role.PLAYER,
        registrationStatus: RegistrationStatus.NEW,
      },
    });
  });

  after(async () => {
    // Cleanup test users
    const userIds = [testUser1?.id, testUser2?.id, testUser3?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.minecraftAuthAttempt.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.minecraftAuthCode.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.registrationStatusHistory.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
  });

  test("1. Requête API non authentifiée rejetée avec HTTP 401", async () => {
    const fakeRequestNoAuth = new NextRequest("http://localhost:3000/api/minecraft/auth", {
      method: "POST",
      body: JSON.stringify({
        code: "TEST1234",
        minecraftUuid: "550e8400-e29b-41d4-a716-446655440000",
        minecraftUsername: "Notch",
      }),
    });

    const responseNoAuth = await authRouteHandler(fakeRequestNoAuth);
    assert.equal(responseNoAuth.status, 401);

    const fakeRequestBadKey = new NextRequest("http://localhost:3000/api/minecraft/auth", {
      method: "POST",
      headers: {
        authorization: "Bearer wrong_secret_key",
      },
      body: JSON.stringify({
        code: "TEST1234",
        minecraftUuid: "550e8400-e29b-41d4-a716-446655440000",
        minecraftUsername: "Notch",
      }),
    });

    const responseBadKey = await authRouteHandler(fakeRequestBadKey);
    assert.equal(responseBadKey.status, 401);
  });

  test("2. Génération de code unique et invalidation des anciens codes", async () => {
    const codeData1 = await createMinecraftAuthCode(testUser1.id);
    assert.ok(codeData1.code);
    assert.equal(codeData1.code.length, 8);

    // Generating another code should invalidate / delete the first code
    const codeData2 = await createMinecraftAuthCode(testUser1.id);
    assert.ok(codeData2.code);
    assert.notEqual(codeData1.code, codeData2.code);

    const oldCodeInDb = await prisma.minecraftAuthCode.findUnique({
      where: { code: codeData1.code },
    });
    assert.equal(oldCodeInDb, null, "L'ancien code doit être invalidé lors d'une nouvelle génération");
  });

  test("3. Code invalide / inexistant rejeté", async () => {
    const result = await verifyAndLinkMinecraftAccount({
      code: "UNKNOWN9",
      minecraftUuid: "c06f8906-4c8a-4911-9c29-ea1dbd1aab82",
      minecraftUsername: "Alex",
      skipMojangCheck: true,
    });

    assert.equal(result.success, false);
    assert.equal(result.error, "INVALID_OR_EXPIRED_CODE");
  });

  test("4. Code expiré rejeté", async () => {
    const expiredCode = "EXPIRE01";
    await prisma.minecraftAuthCode.create({
      data: {
        code: expiredCode,
        userId: testUser2.id,
        expiresAt: new Date(Date.now() - 60 * 1000), // expired 1 minute ago
      },
    });

    const result = await verifyAndLinkMinecraftAccount({
      code: expiredCode,
      minecraftUuid: "b7e42d76-e17f-4409-b68b-59d09c6dc49f",
      minecraftUsername: "ExpiredUser",
      skipMojangCheck: true,
    });

    assert.equal(result.success, false);
    assert.equal(result.error, "INVALID_OR_EXPIRED_CODE");
  });

  test("5. Code déjà utilisé rejeté", async () => {
    const usedCode = "USED0001";
    await prisma.minecraftAuthCode.create({
      data: {
        code: usedCode,
        userId: testUser2.id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        usedAt: new Date(),
      },
    });

    const result = await verifyAndLinkMinecraftAccount({
      code: usedCode,
      minecraftUuid: "b7e42d76-e17f-4409-b68b-59d09c6dc49f",
      minecraftUsername: "UsedUser",
      skipMojangCheck: true,
    });

    assert.equal(result.success, false);
    assert.equal(result.error, "INVALID_OR_EXPIRED_CODE");
  });

  test("6. Liaison réussie : met à jour User, registrationStatus=WAITLIST, historique et audit", async () => {
    const authCodeData = await createMinecraftAuthCode(testUser1.id);
    const targetUuid = "853c80ef-3c37-49fd-aa49-938b674adae6";
    const targetUsername = "Steve_Hyori";

    const result = await verifyAndLinkMinecraftAccount({
      code: authCodeData.code,
      minecraftUuid: targetUuid,
      minecraftUsername: targetUsername,
      ipAddress: "127.0.0.1",
      skipMojangCheck: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.minecraftUsername, targetUsername);

    // Verify User record updated
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUser1.id },
    });
    assert.equal(updatedUser?.minecraftUuid, targetUuid);
    assert.equal(updatedUser?.minecraftUsername, targetUsername);
    assert.equal(updatedUser?.registrationStatus, RegistrationStatus.WAITLIST);

    // Verify Code is marked as used
    const dbCode = await prisma.minecraftAuthCode.findUnique({
      where: { code: authCodeData.code },
    });
    assert.ok(dbCode?.usedAt, "Le code doit être marqué comme utilisé");

    // Verify RegistrationStatusHistory entry
    const history = await prisma.registrationStatusHistory.findFirst({
      where: { userId: testUser1.id, status: RegistrationStatus.WAITLIST },
    });
    assert.ok(history, "Une entrée dans registration_status_history doit exister");

    // Verify Audit log entry
    const audit = await prisma.minecraftAuthAttempt.findFirst({
      where: { userId: testUser1.id, success: true },
    });
    assert.ok(audit, "Un audit log de succès doit être enregistré");
  });

  test("7. UUID déjà lié à un autre compte est rejeté", async () => {
    // testUser1 is already linked to targetUuid
    const alreadyLinkedUuid = "853c80ef-3c37-49fd-aa49-938b674adae6";

    // testUser2 attempts to link the same UUID
    const authCodeData = await createMinecraftAuthCode(testUser2.id);

    const result = await verifyAndLinkMinecraftAccount({
      code: authCodeData.code,
      minecraftUuid: alreadyLinkedUuid,
      minecraftUsername: "Steve_Imposter",
      skipMojangCheck: true,
    });

    assert.equal(result.success, false);
    assert.equal(result.error, "UUID_ALREADY_LINKED");
  });

  test("8. Double soumission concurrente (concurrency test)", async () => {
    const authCodeData = await createMinecraftAuthCode(testUser3.id);
    const targetUuid = "99999999-3c37-49fd-aa49-938b674adae6";
    const targetUsername = "ConcurrentPlayer";

    // Execute two simultaneous validation requests with the same code
    const [res1, res2] = await Promise.all([
      verifyAndLinkMinecraftAccount({
        code: authCodeData.code,
        minecraftUuid: targetUuid,
        minecraftUsername: targetUsername,
        ipAddress: "127.0.0.1",
        skipMojangCheck: true,
      }),
      verifyAndLinkMinecraftAccount({
        code: authCodeData.code,
        minecraftUuid: targetUuid,
        minecraftUsername: targetUsername,
        ipAddress: "127.0.0.1",
        skipMojangCheck: true,
      }),
    ]);

    const successes = [res1, res2].filter((r) => r.success);
    const failures = [res1, res2].filter((r) => !r.success);

    assert.equal(successes.length, 1, "Exactement une seule requête concurrente doit réussir");
    assert.equal(failures.length, 1, "L'autre requête concurrente doit être rejetée");
    assert.equal(failures[0].error, "INVALID_OR_EXPIRED_CODE");
  });
});
