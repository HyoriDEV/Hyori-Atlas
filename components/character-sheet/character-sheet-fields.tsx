"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ADDITIONAL_COMMENTS_MAX_LENGTH,
  AGE_MAX,
  AGE_MIN,
  BACKGROUND_MAX_LENGTH,
  BACKGROUND_MIN_LENGTH,
  CIVIL_STATUS_MAX_LENGTH,
  CIVIL_STATUS_MIN_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  HEIGHT_MAX,
  HEIGHT_MIN,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  NICKNAME_MAX_LENGTH,
} from "@/lib/character-sheet";

export interface CharacterSheetFieldValues {
  name: string;
  nickname: string;
  age: string;
  gender: string;
  civilStatus: string;
  heightCm: string;
  description: string;
  background: string;
  additionalComments: string;
}

export type CharacterSheetFieldKey = keyof CharacterSheetFieldValues;

const civilFields: {
  key: CharacterSheetFieldKey;
  label: string;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  step?: string;
}[] = [
  {
    key: "name",
    label: "Nom RP",
    placeholder: "Ex: Sengo Muramasa",
    minLength: NAME_MIN_LENGTH,
    maxLength: NAME_MAX_LENGTH,
  },
  {
    key: "nickname",
    label: "Surnom (optionnel)",
    placeholder: "Ex: Le Forgeron maudit",
    maxLength: NICKNAME_MAX_LENGTH,
  },
  { key: "gender", label: "Genre" },
  {
    key: "civilStatus",
    label: "Statut",
    placeholder: "Ex: Maître forgeron",
    minLength: CIVIL_STATUS_MIN_LENGTH,
    maxLength: CIVIL_STATUS_MAX_LENGTH,
  },
  {
    key: "age",
    label: "Âge",
    placeholder: "16-64",
    type: "number",
    min: AGE_MIN,
    max: AGE_MAX,
  },
  {
    key: "heightCm",
    label: "Taille (cm)",
    placeholder: "150-200",
    type: "number",
    min: HEIGHT_MIN,
    max: HEIGHT_MAX,
    step: "1",
  },
];

const textFields: {
  key: CharacterSheetFieldKey;
  label: string;
  placeholder: string;
  rows: number;
  minLength?: number;
  maxLength?: number;
  className?: string;
}[] = [
  {
    key: "description",
    label: "Description",
    placeholder:
      "Décris son caractère, son attitude générale, ses tics de langage, ses petites manies...",
    rows: 8,
    minLength: DESCRIPTION_MIN_LENGTH,
    maxLength: DESCRIPTION_MAX_LENGTH,
    className: "min-h-[12rem]",
  },
  {
    key: "background",
    label: "Histoire",
    placeholder:
      "D'où vient ton personnage, quels événements ont forgé son caractère, quels sont ses objectifs...",
    rows: 8,
    minLength: BACKGROUND_MIN_LENGTH,
    maxLength: BACKGROUND_MAX_LENGTH,
    className: "min-h-[12rem]",
  },
  {
    key: "additionalComments",
    label: "Commentaires additionnels (optionnel)",
    placeholder: "Liens avec d'autres personnages, remarques HRP...",
    rows: 4,
    maxLength: ADDITIONAL_COMMENTS_MAX_LENGTH,
    className: "min-h-[6rem]",
  },
];

export function CharacterSheetFields({
  values,
  interactive = false,
  onChange,
}: {
  values: CharacterSheetFieldValues;
  interactive?: boolean;
  onChange?: (key: CharacterSheetFieldKey, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Informations civiles</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {civilFields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              {field.key === "gender" ? (
                interactive ? (
                  <Select
                    value={values.gender}
                    onValueChange={(val) => onChange?.("gender", val ?? "")}
                  >
                    <SelectTrigger id="gender" className="w-full">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Femme">Femme</SelectItem>
                      <SelectItem value="Homme">Homme</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">{values.gender || "—"}</p>
                )
              ) : interactive ? (
                <Input
                  id={field.key}
                  type={field.type ?? "text"}
                  min={field.min}
                  max={field.max}
                  minLength={field.minLength}
                  maxLength={field.maxLength}
                  step={field.step}
                  placeholder={field.placeholder}
                  value={values[field.key]}
                  onChange={(event) => onChange?.(field.key, event.target.value)}
                />
              ) : (
                <p className="text-sm">
                  {values[field.key] || "—"}
                  {field.key === "heightCm" && values[field.key] ? " cm" : ""}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Personnage</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {textFields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              {interactive ? (
                <>
                  <Textarea
                    id={field.key}
                    rows={field.rows}
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                    className={field.className}
                    placeholder={field.placeholder}
                    value={values[field.key]}
                    onChange={(event) => onChange?.(field.key, event.target.value)}
                  />
                  <div className="text-muted-foreground flex justify-end text-xs">
                    {field.minLength ? (
                      <span>
                        {values[field.key].length} / {field.maxLength} caractères (min.{" "}
                        {field.minLength})
                      </span>
                    ) : (
                      <span>
                        {values[field.key].length} / {field.maxLength} caractères
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{values[field.key] || "—"}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
