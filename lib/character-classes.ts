import type React from "react";
import { Crown, Fish, Plant, Scroll } from "@phosphor-icons/react";
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
    label: "Nobles",
    singularLabel: "Noble",
    description: "Aristocrates, stratèges politiques et maîtres de domaine.",
    icon: Crown,
  },
  {
    id: CharacterClass.PAYSAN,
    label: "Paysans",
    singularLabel: "Paysan",
    description: "Agriculteurs, éleveurs et artisans ruraux indispensables à la cité.",
    icon: Plant,
  },
  {
    id: CharacterClass.PECHEUR,
    label: "Pêcheurs",
    singularLabel: "Pêcheur",
    description: "Navigateurs côtiers, maîtres des filets et des eaux fluviales.",
    icon: Fish,
  },
  {
    id: CharacterClass.MINEUR,
    label: "Mineurs",
    singularLabel: "Mineur",
    description: "Prospecteurs infatigables, tailleurs de pierre et extracteurs de minerai.",
    icon: PickaxeIcon,
  },
  {
    id: CharacterClass.ERUDIT,
    label: "Érudits",
    singularLabel: "Érudit",
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
