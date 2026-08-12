import { Role, RegistrationStatus } from "../../lib/generated/prisma/enums";

export interface DevTestUser {
  id: string;
  role: Role;
  registrationStatus: RegistrationStatus;
  discordId: string;
  discordUsername: string;
  discordDisplayName: string;
  discordAvatarUrl: string;
  roleLabel: string;
}

export const DEV_TEST_USERS: DevTestUser[] = [
  {
    id: "admin",
    role: Role.ADMIN,
    registrationStatus: RegistrationStatus.NEW,
    discordId: "100000000000000001",
    discordUsername: "dev_admin",
    discordDisplayName: "Admin (Test)",
    discordAvatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
    roleLabel: "Administrateur",
  },
  {
    id: "developer",
    role: Role.DEVELOPER,
    registrationStatus: RegistrationStatus.NEW,
    discordId: "100000000000000002",
    discordUsername: "dev_developer",
    discordDisplayName: "Développeur (Test)",
    discordAvatarUrl: "https://cdn.discordapp.com/embed/avatars/1.png",
    roleLabel: "Développeur",
  },
  {
    id: "communication",
    role: Role.COMMUNICATION,
    registrationStatus: RegistrationStatus.NEW,
    discordId: "100000000000000003",
    discordUsername: "dev_comm",
    discordDisplayName: "Staff Communication (Test)",
    discordAvatarUrl: "https://cdn.discordapp.com/embed/avatars/2.png",
    roleLabel: "Communication",
  },
  {
    id: "conflict-management",
    role: Role.CONFLICT_MANAGEMENT,
    registrationStatus: RegistrationStatus.NEW,
    discordId: "100000000000000004",
    discordUsername: "dev_bda",
    discordDisplayName: "Staff BDA (Test)",
    discordAvatarUrl: "https://cdn.discordapp.com/embed/avatars/3.png",
    roleLabel: "Gestion des conflits",
  },
  {
    id: "rp-tracking",
    role: Role.RP_TRACKING,
    registrationStatus: RegistrationStatus.NEW,
    discordId: "100000000000000005",
    discordUsername: "dev_rp",
    discordDisplayName: "Staff Suivi RP (Test)",
    discordAvatarUrl: "https://cdn.discordapp.com/embed/avatars/4.png",
    roleLabel: "Suivi RP",
  },
  {
    id: "player-01",
    role: Role.PLAYER,
    registrationStatus: RegistrationStatus.NEW,
    discordId: "443116729187696650",
    discordUsername: "sohaliaaa",
    discordDisplayName: "Sohalia",
    discordAvatarUrl:
      "https://cdn.discordapp.com/avatars/443116729187696650/df052a5af82e8d95173e38ca2369a7cc.png",
    roleLabel: "Sohalia",
  },
  {
    id: "player-02",
    role: Role.PLAYER,
    registrationStatus: RegistrationStatus.NEW,
    discordId: "957391466068607027",
    discordUsername: "zckl1",
    discordDisplayName: "Zackk",
    discordAvatarUrl:
      "https://cdn.discordapp.com/avatars/957391466068607027/22286cb1be288b12dc1debb12c1bbd46.png",
    roleLabel: "Zackk",
  },
  {
    id: "player-03",
    role: Role.PLAYER,
    registrationStatus: RegistrationStatus.NEW,
    discordId: "148765249498120192",
    discordUsername: "taiike0",
    discordDisplayName: "Taikeo",
    discordAvatarUrl:
      "https://cdn.discordapp.com/avatars/148765249498120192/cb6b8fa1fa2f07c0af5ec312a2c8b5b3.png",
    roleLabel: "Taikeo",
  },
  {
    id: "player-04",
    role: Role.PLAYER,
    registrationStatus: RegistrationStatus.NEW,
    discordId: "343338598139035659",
    discordUsername: "mahyster",
    discordDisplayName: "Mahyster",
    discordAvatarUrl:
      "https://cdn.discordapp.com/avatars/343338598139035659/a_0110a17c52e57caa1d65041dc3d900c8.gif",
    roleLabel: "Mahyster",
  },
  {
    id: "player-05",
    role: Role.PLAYER,
    registrationStatus: RegistrationStatus.NEW,
    discordId: "374531663570534400",
    discordUsername: "pauleauh",
    discordDisplayName: "PauIo",
    discordAvatarUrl:
      "https://cdn.discordapp.com/avatars/374531663570534400/92dfeec6f01896ebff0ebe834df9f97f.png",
    roleLabel: "PauIo",
  },
];
