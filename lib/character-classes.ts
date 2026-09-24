import type React from "react";
import { Crown, Fish, Plant, Scroll } from "@phosphor-icons/react/dist/ssr";
import { CharacterClass } from "@/lib/generated/prisma/enums";
import { PickaxeIcon } from "@/components/character-sheet/pickaxe-icon";

export { CharacterClass };

export interface CharacterClassDefinition {
  id: CharacterClass;
  label: string;
  singularLabel: string;
  description: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

export const CHARACTER_CLASSES: CharacterClassDefinition[] = [
  {
    id: CharacterClass.NOBLE,
    label: "Grande ville",
    singularLabel: "Grande ville",
    description: "Aristocrates, stratèges politiques et maîtres de domaine.",
    icon: Crown,
  },
  {
    id: CharacterClass.PAYSAN,
    label: "Village des paysans",
    singularLabel: "Village des paysans",
    description: "Agriculteurs, éleveurs et artisans ruraux indispensables à la cité.",
    icon: Plant,
  },
  {
    id: CharacterClass.PECHEUR,
    label: "Village de pêche",
    singularLabel: "Village de pêche",
    description: "Navigateurs côtiers, maîtres des filets et des eaux fluviales.",
    icon: Fish,
  },
  {
    id: CharacterClass.MINEUR,
    label: "Village des mines",
    singularLabel: "Village des mines",
    description: "Prospecteurs infatigables, tailleurs de pierre et extracteurs de minerai.",
    icon: PickaxeIcon,
  },
  {
    id: CharacterClass.ERUDIT,
    label: "Village des érudits",
    singularLabel: "Village des érudits",
    description: "Scribes, chercheurs, historiens et dépositaires du savoir ancien.",
    icon: Scroll,
  },
];

export const CHARACTER_CLASS_MAP = new Map<CharacterClass, CharacterClassDefinition>(
  CHARACTER_CLASSES.map((cls) => [cls.id, cls])
);

export const REQUIRED_CLASS_CHOICES_COUNT = 2;
export const MAX_CLASS_CHOICES_COUNT = 2;

export function getCharacterClassDefinition(id: CharacterClass): CharacterClassDefinition {
  const def = CHARACTER_CLASS_MAP.get(id);
  if (!def) {
    throw new Error(`Classe de personnage inconnue: ${id}`);
  }
  return def;
}

export function isCharacterClass(value: unknown): value is CharacterClass {
  return (
    typeof value === "string" && Object.values(CharacterClass).includes(value as CharacterClass)
  );
}

export function isValidClassSelection(classes: CharacterClass[]): boolean {
  if (!Array.isArray(classes) || classes.length !== REQUIRED_CLASS_CHOICES_COUNT) {
    return false;
  }
  const unique = new Set(classes);
  return unique.size === REQUIRED_CLASS_CHOICES_COUNT && classes.every(isCharacterClass);
}

export function isValidDraftClassSelection(classes: CharacterClass[]): boolean {
  if (!Array.isArray(classes) || classes.length > MAX_CLASS_CHOICES_COUNT) {
    return false;
  }
  const unique = new Set(classes);
  return unique.size === classes.length && classes.every(isCharacterClass);
}

/**
 * Tente de convertir un nom de classe libre, un label ou un identifiant en enum CharacterClass valide.
 */
export function resolveToCharacterClass(value: unknown): CharacterClass | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (isCharacterClass(trimmed)) {
    return trimmed;
  }
  const normalized = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    normalized.includes("noble") ||
    normalized.includes("grande ville") ||
    normalized.includes("ville")
  ) {
    return CharacterClass.NOBLE;
  }
  if (normalized.includes("paysan") || normalized.includes("agricul")) {
    return CharacterClass.PAYSAN;
  }
  if (normalized.includes("pech")) {
    return CharacterClass.PECHEUR;
  }
  if (normalized.includes("mine")) {
    return CharacterClass.MINEUR;
  }
  if (normalized.includes("erudit") || normalized.includes("savoir")) {
    return CharacterClass.ERUDIT;
  }
  return null;
}
