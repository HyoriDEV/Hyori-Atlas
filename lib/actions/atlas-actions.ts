"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { staffNavItems } from "@/lib/navigation";

import { RegistrationStatus } from "@/lib/generated/prisma/enums";

const STAFF_NOTE_MAX_LENGTH = 1000;

export async function addStaffNote(playerId: string, body: string) {
  const atlasItem = staffNavItems.find((item) => item.href === "/staff/atlas")!;
  const staffUser = await requireRole(atlasItem.roles);

  const player = await prisma.user.findUnique({
    where: { id: playerId },
    select: { registrationStatus: true },
  });

  if (!player || player.registrationStatus === RegistrationStatus.REJECTED) {
    throw new Error("Joueur introuvable.");
  }

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("La note ne peut pas être vide.");
  }
  if (trimmedBody.length > STAFF_NOTE_MAX_LENGTH) {
    throw new Error(`La note ne peut pas dépasser ${STAFF_NOTE_MAX_LENGTH} caractères.`);
  }

  await prisma.staffNote.create({
    data: { playerId, authorId: staffUser.id, body: trimmedBody },
  });

  revalidatePath(`/staff/atlas/${playerId}`);
}

export async function updateStaffNote(noteId: string, body: string) {
  const atlasItem = staffNavItems.find((item) => item.href === "/staff/atlas")!;
  const staffUser = await requireRole(atlasItem.roles);

  const note = await prisma.staffNote.findUnique({
    where: { id: noteId },
  });

  if (!note) {
    throw new Error("Note introuvable.");
  }

  if (note.authorId !== staffUser.id) {
    throw new Error("Tu ne peux modifier que tes propres notes.");
  }

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("La note ne peut pas être vide.");
  }
  if (trimmedBody.length > STAFF_NOTE_MAX_LENGTH) {
    throw new Error(`La note ne peut pas dépasser ${STAFF_NOTE_MAX_LENGTH} caractères.`);
  }

  await prisma.staffNote.update({
    where: { id: noteId },
    data: { body: trimmedBody },
  });

  revalidatePath(`/staff/atlas/${note.playerId}`);
}

export async function deleteStaffNote(noteId: string) {
  const atlasItem = staffNavItems.find((item) => item.href === "/staff/atlas")!;
  const staffUser = await requireRole(atlasItem.roles);

  const note = await prisma.staffNote.findUnique({
    where: { id: noteId },
  });

  if (!note) {
    throw new Error("Note introuvable.");
  }

  if (note.authorId !== staffUser.id) {
    throw new Error("Tu ne peux supprimer que tes propres notes.");
  }

  await prisma.staffNote.delete({
    where: { id: noteId },
  });

  revalidatePath(`/staff/atlas/${note.playerId}`);
}
