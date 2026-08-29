import { CharacterSheetStatus } from "@/lib/generated/prisma/enums";

export type SkillCategory = "PHYSICAL" | "MENTAL" | "SOCIAL";

export type SkillField =
  | "physicalForce"
  | "physicalEndurance"
  | "physicalStealth"
  | "physicalDexterity"
  | "mentalIntelligence"
  | "mentalComposure"
  | "mentalWeaponsMastery"
  | "socialCharisma"
  | "socialPersuasion"
  | "socialViolence";

export interface SkillDefinition {
  field: SkillField;
  label: string;
  lowLabel: string;
  highLabel: string;
}

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    field: "physicalForce",
    label: "Force",
    lowLabel: "Frêle",
    highLabel: "Colosse",
  },
  {
    field: "physicalEndurance",
    label: "Endurance",
    lowLabel: "Fragile",
    highLabel: "Increvable",
  },
  {
    field: "physicalStealth",
    label: "Discrétion",
    lowLabel: "Bruyant·e",
    highLabel: "Furtif·ive",
  },
  {
    field: "physicalDexterity",
    label: "Dextérité",
    lowLabel: "Maladroit·e",
    highLabel: "Agile",
  },
  {
    field: "mentalIntelligence",
    label: "Intelligence",
    lowLabel: "Simplet·te",
    highLabel: "Aiguisé·e",
  },
  {
    field: "mentalComposure",
    label: "Sang-froid",
    lowLabel: "Impulsif·ve",
    highLabel: "Stoïque",
  },
  {
    field: "mentalWeaponsMastery",
    label: "Maîtrise des armes",
    lowLabel: "Inexercé·e",
    highLabel: "Vétéran·e",
  },
  {
    field: "socialCharisma",
    label: "Charisme",
    lowLabel: "Effacé·e",
    highLabel: "Magnétique",
  },
  {
    field: "socialPersuasion",
    label: "Persuasion",
    lowLabel: "Hésitant·e",
    highLabel: "Manipulateur·rice",
  },
  {
    field: "socialViolence",
    label: "Violence",
    lowLabel: "Pacifiste",
    highLabel: "Sanguinaire",
  },
];

export type SkillValues = Record<SkillField, number>;

export const MIN_TOTAL_SKILL_POINTS = 10;
export const MAX_TOTAL_SKILL_POINTS = 30;
export const MIN_SKILL_POINTS = 1;
export const MAX_SKILL_POINTS = 5;

export const AGE_MIN = 16;
export const AGE_MAX = 64;
export const HEIGHT_MIN = 150;
export const HEIGHT_MAX = 200;

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 50;

export const NICKNAME_MAX_LENGTH = 50;

export const CIVIL_STATUS_MIN_LENGTH = 2;
export const CIVIL_STATUS_MAX_LENGTH = 50;

export const DESCRIPTION_MIN_LENGTH = 300;
export const DESCRIPTION_MAX_LENGTH = 2000;

export const BACKGROUND_MIN_LENGTH = 300;
export const BACKGROUND_MAX_LENGTH = 2000;

export const ADDITIONAL_COMMENTS_MAX_LENGTH = 300;

export function sumSkillPoints(values: SkillValues): number {
  return SKILL_DEFINITIONS.reduce((total, skill) => total + values[skill.field], 0);
}

export function isTotalSkillPointsValid(total: number): boolean {
  return (
    Number.isInteger(total) && total >= MIN_TOTAL_SKILL_POINTS && total <= MAX_TOTAL_SKILL_POINTS
  );
}

export function isSkillValueValid(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_SKILL_POINTS && value <= MAX_SKILL_POINTS;
}

export function isCharacterSheetEditable(status: CharacterSheetStatus): boolean {
  return status === CharacterSheetStatus.PENDING_PLAYER;
}

export function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const clipped = text.slice(0, maxLength);
  const lastSpaceIndex = clipped.lastIndexOf(" ");

  return `${(lastSpaceIndex > maxLength * 0.6 ? clipped.slice(0, lastSpaceIndex) : clipped).trimEnd()}…`;
}
