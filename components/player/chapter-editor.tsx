"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  TextB,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
  Code as CodeIcon,
  LinkSimple,
  Image as ImageIcon,
  ListBullets,
  ListNumbers,
  Quotes,
  Minus,
  ArrowCounterClockwise,
  ArrowClockwise,
  CheckCircle,
  CircleNotch,
  TextAa,
  TextHOne,
  TextHTwo,
  TextHThree,
  Paragraph as ParagraphIcon,
  SidebarSimple,
  Check,
  Copy,
  Sun,
  Moon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { updateChapterContent, updateChapterTitle } from "@/lib/actions/chapter-actions";
import { uploadChapterImage } from "@/lib/actions/upload-actions";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const AUTOSAVE_DELAY_MS = 2000;
const FONT_FAMILY_STORAGE_KEY = "hyori_writing_font_family";
const FONT_SIZE_STORAGE_KEY = "hyori_writing_font_size";
const THEME_STORAGE_KEY = "hyori_writing_theme";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function useWritingPreference<T extends string>(
  key: string,
  defaultValue: T,
  isValid: (val: string) => boolean
): [T, (val: T) => void] {
  const [override, setOverride] = useState<T | null>(null);

  const stored = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const val = localStorage.getItem(key);
        if (val && isValid(val)) return val as T;
      } catch {}
      return defaultValue;
    },
    () => defaultValue
  );

  const value = override ?? stored;

  const setValue = (val: T) => {
    setOverride(val);
    try {
      localStorage.setItem(key, val);
    } catch {}
  };

  return [value, setValue];
}

function computeWordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function computeReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

interface ChapterEditorProps {
  chapterId: string;
  initialTitle: string;
  initialContent: string;
  onTitleChange?: (title: string) => void;
  onContentChange?: (content: string, wordCount: number) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  readOnly?: boolean;
}

export function ChapterEditor({
  chapterId,
  initialTitle,
  initialContent,
  onTitleChange,
  onContentChange,
  isSidebarOpen = true,
  onToggleSidebar,
  readOnly = false,
}: ChapterEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [fontFamily, setFontFamily] = useWritingPreference<"serif" | "sans">(
    FONT_FAMILY_STORAGE_KEY,
    "serif",
    (val) => val === "serif" || val === "sans"
  );
  const [fontSize, setFontSize] = useWritingPreference<"small" | "normal" | "large">(
    FONT_SIZE_STORAGE_KEY,
    "normal",
    (val) => val === "small" || val === "normal" || val === "large"
  );
  const [theme, setTheme] = useWritingPreference<"dark" | "light">(
    THEME_STORAGE_KEY,
    "dark",
    (val) => val === "dark" || val === "light"
  );

  function handleThemeToggle() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        underline: false,
        link: false,
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Image,
    ],
    content: initialContent,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off",
        "data-gramm": "false",
        class: cn(
          "focus:outline-none min-h-[450px] pb-32 transition-all",
          fontFamily === "serif" ? "font-chapter-serif" : "font-chapter-sans"
        ),
      },
    },
    onCreate: ({ editor }) => {
      const text = editor.getText();
      const count = computeWordCount(text);
      setWordCount(count);
      setCharCount(text.length);
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const count = computeWordCount(text);
      setWordCount(count);
      setCharCount(text.length);

      const html = editor.getHTML();
      onContentChange?.(html, count);

      setSaveState("saving");
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        updateChapterContent(chapterId, html).then(() => {
          setSaveState("saved");
          const now = new Date();
          setLastSavedAt(
            `${String(now.getHours()).padStart(2, "0")}h${String(now.getMinutes()).padStart(2, "0")}`
          );
        });
      }, AUTOSAVE_DELAY_MS);
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setOptions({
        editorProps: {
          attributes: {
            spellcheck: "false",
            autocorrect: "off",
            autocapitalize: "off",
            "data-gramm": "false",
            class: cn(
              "focus:outline-none min-h-[450px] pb-32 transition-all",
              fontFamily === "serif" ? "font-chapter-serif" : "font-chapter-sans"
            ),
          },
        },
      });
    }
  }, [editor, fontFamily]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    };
  }, []);

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    onTitleChange?.(newTitle);

    setSaveState("saving");
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(async () => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;
      try {
        await updateChapterTitle(chapterId, trimmed);
        setSaveState("saved");
        const now = new Date();
        setLastSavedAt(
          `${String(now.getHours()).padStart(2, "0")}h${String(now.getMinutes()).padStart(2, "0")}`
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur de sauvegarde du titre.");
      }
    }, AUTOSAVE_DELAY_MS);
  }

  async function handleImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const { url } = await uploadChapterImage(formData);
      editor.chain().focus().setImage({ src: url }).run();
      toast.success("Illustration insérée dans le chapitre.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec du téléversement de l'image.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleSetLink() {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl.trim() }).run();
    setLinkUrl("");
  }

  function handleCopyPlainText() {
    if (!editor) return;
    const plain = `${title}\n\n${editor.getText()}`;
    navigator.clipboard.writeText(plain);
    toast.success("Texte copié dans le presse-papier.");
  }

  if (!editor) return null;

  const currentBlockLabel = editor.isActive("heading", { level: 1 })
    ? "Titre 1"
    : editor.isActive("heading", { level: 2 })
      ? "Titre 2"
      : editor.isActive("heading", { level: 3 })
        ? "Titre 3"
        : editor.isActive("blockquote")
          ? "Citation"
          : "Paragraphe";

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden transition-colors duration-200",
        theme === "light" && "editor-light"
      )}
    >
      {!readOnly && (
        <BubbleMenu
          editor={editor}
          className="bg-card/95 ring-border/70 text-card-foreground flex items-center gap-1 rounded-lg p-1.5 shadow-xl ring-1 backdrop-blur-md"
        >
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Gras"
          className="size-8 p-1"
        >
          <TextB className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italique"
          className="size-8 p-1"
        >
          <TextItalic className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("underline")}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Souligné"
          className="size-8 p-1"
        >
          <TextUnderline className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("strike")}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Barré"
          className="size-8 p-1"
        >
          <TextStrikethrough className="size-4" />
        </Toggle>
        <div className="bg-border/60 mx-1 h-5 w-px" />
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Titre 2"
          className="size-8 p-1"
        >
          <TextHTwo className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("blockquote")}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Citation"
          className="size-8 p-1"
        >
          <Quotes className="size-4" />
        </Toggle>
      </BubbleMenu>
      )}

      <div className="bg-card/90 border-border/80 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-2.5 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1.5">
          {onToggleSidebar && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant={isSidebarOpen ? "secondary" : "ghost"}
                    size="icon-xs"
                    onClick={onToggleSidebar}
                    aria-label="Afficher/Masquer la liste des chapitres"
                    className="text-muted-foreground hover:text-foreground mr-1 size-8 p-1"
                  />
                }
              >
                <SidebarSimple className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isSidebarOpen ? "Masquer les chapitres" : "Afficher les chapitres"}
              </TooltipContent>
            </Tooltip>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8.5 gap-2 px-3 text-sm font-medium"
                />
              }
            >
              <span>{currentBlockLabel}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className={cn("w-48", theme === "light" && "editor-light")}
            >
              <DropdownMenuItem
                onClick={() => editor.chain().focus().setParagraph().run()}
                className="gap-2.5 py-1.5 text-sm"
              >
                <ParagraphIcon className="size-4" />
                <span>Paragraphe</span>
                {currentBlockLabel === "Paragraphe" && <Check className="ml-auto size-3.5" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className="gap-2.5 py-1.5 text-sm font-semibold"
              >
                <TextHOne className="size-4" />
                <span>Grand Titre (H1)</span>
                {currentBlockLabel === "Titre 1" && <Check className="ml-auto size-3.5" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className="gap-2.5 py-1.5 text-sm font-semibold"
              >
                <TextHTwo className="size-4" />
                <span>Titre de section (H2)</span>
                {currentBlockLabel === "Titre 2" && <Check className="ml-auto size-3.5" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className="text-primary gap-2.5 py-1.5 text-sm font-medium"
              >
                <TextHThree className="size-4" />
                <span>Sous-titre (H3)</span>
                {currentBlockLabel === "Titre 3" && <Check className="ml-auto size-3.5" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className="gap-2.5 py-1.5 text-sm italic"
              >
                <Quotes className="size-4" />
                <span>Citation / Dialogue</span>
                {currentBlockLabel === "Citation" && <Check className="ml-auto size-3.5" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="bg-border/60 mx-1 h-5 w-px" />

          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle
                  size="sm"
                  pressed={editor.isActive("bold")}
                  onPressedChange={() => editor.chain().focus().toggleBold().run()}
                  aria-label="Gras (Ctrl+B)"
                  className="size-8 p-1"
                />
              }
            >
              <TextB className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Gras (Ctrl+B)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle
                  size="sm"
                  pressed={editor.isActive("italic")}
                  onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                  aria-label="Italique (Ctrl+I)"
                  className="size-8 p-1"
                />
              }
            >
              <TextItalic className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Italique (Ctrl+I)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle
                  size="sm"
                  pressed={editor.isActive("underline")}
                  onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
                  aria-label="Souligné (Ctrl+U)"
                  className="size-8 p-1"
                />
              }
            >
              <TextUnderline className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Souligné (Ctrl+U)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle
                  size="sm"
                  pressed={editor.isActive("strike")}
                  onPressedChange={() => editor.chain().focus().toggleStrike().run()}
                  aria-label="Barré"
                  className="size-8 p-1"
                />
              }
            >
              <TextStrikethrough className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Barré</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle
                  size="sm"
                  pressed={editor.isActive("code")}
                  onPressedChange={() => editor.chain().focus().toggleCode().run()}
                  aria-label="Code en ligne"
                  className="size-8 p-1"
                />
              }
            >
              <CodeIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Code en ligne</TooltipContent>
          </Tooltip>

          <div className="bg-border/60 mx-1 h-5 w-px" />

          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle
                  size="sm"
                  pressed={editor.isActive("bulletList")}
                  onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                  aria-label="Liste à puces"
                  className="size-8 p-1"
                />
              }
            >
              <ListBullets className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Liste à puces</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle
                  size="sm"
                  pressed={editor.isActive("orderedList")}
                  onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                  aria-label="Liste numérotée"
                  className="size-8 p-1"
                />
              }
            >
              <ListNumbers className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Liste numérotée</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  aria-label="Séparateur de scène"
                  className="size-8 p-1"
                />
              }
            >
              <Minus className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Séparateur de scène</TooltipContent>
          </Tooltip>

          <div className="bg-border/60 mx-1 h-5 w-px" />

          <Popover
            onOpenChange={(open) => {
              if (open) setLinkUrl(editor.getAttributes("link").href ?? "");
            }}
          >
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant={editor.isActive("link") ? "secondary" : "ghost"}
                  size="icon-xs"
                  aria-label="Insérer un lien"
                  className="size-8 p-1"
                />
              }
            >
              <LinkSimple className="size-4" />
            </PopoverTrigger>
            <PopoverContent
              className={cn("flex w-80 flex-row gap-2 p-2.5", theme === "light" && "editor-light")}
              align="start"
            >
              <Input
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://..."
                className="h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSetLink();
                }}
              />
              <Button type="button" size="sm" onClick={handleSetLink} className="h-9 px-3 text-sm">
                Appliquer
              </Button>
            </PopoverContent>
          </Popover>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageSelected}
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  aria-label="Insérer une image"
                  className="size-8 p-1"
                />
              }
            >
              {isUploading ? (
                <CircleNotch className="text-primary size-4 animate-spin" />
              ) : (
                <ImageIcon className="size-4" />
              )}
            </TooltipTrigger>
            <TooltipContent side="bottom">Insérer une illustration</TooltipContent>
          </Tooltip>

          <div className="bg-border/60 mx-1 h-5 w-px" />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                  aria-label="Annuler (Ctrl+Z)"
                  className="size-8 p-1"
                />
              }
            >
              <ArrowCounterClockwise className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Annuler (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                  aria-label="Rétablir (Ctrl+Y)"
                  className="size-8 p-1"
                />
              }
            >
              <ArrowClockwise className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Rétablir (Ctrl+Y)</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-muted-foreground flex items-center gap-2 text-xs sm:text-sm">
            {saveState === "saving" ? (
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <CircleNotch className="size-3.5 animate-spin" />
                <span className="hidden sm:inline">Enregistrement...</span>
              </span>
            ) : saveState === "saved" ? (
              <span className="text-primary flex items-center gap-1.5 font-medium">
                <CheckCircle className="size-4" />
                <span className="hidden sm:inline">
                  {lastSavedAt ? `Enregistré à ${lastSavedAt}` : "Enregistré"}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground/75 hidden sm:inline">Enregistré</span>
            )}
          </div>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Préférences typographiques"
                        className="text-muted-foreground hover:text-foreground size-8 p-1"
                      />
                    }
                  >
                    <TextAa className="size-4" />
                  </DropdownMenuTrigger>
                }
              >
                <TextAa className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom">Préférences typographiques</TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              className={cn("w-60", theme === "light" && "editor-light")}
            >
              <DropdownMenuRadioGroup
                value={fontFamily}
                onValueChange={(val) => setFontFamily(val as "serif" | "sans")}
              >
                <DropdownMenuLabel className="text-xs">Police du texte</DropdownMenuLabel>
                <DropdownMenuRadioItem value="serif" className="py-1.5 text-sm">
                  Source Serif (Livre classique)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="sans" className="py-1.5 text-sm">
                  Inter (Moderne épuré)
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />

              <DropdownMenuRadioGroup
                value={fontSize}
                onValueChange={(val) => setFontSize(val as "small" | "normal" | "large")}
              >
                <DropdownMenuLabel className="text-xs">Taille du texte</DropdownMenuLabel>
                <DropdownMenuRadioItem value="small" className="py-1.5 text-sm">
                  Petite
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="normal" className="py-1.5 text-sm">
                  Standard
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="large" className="py-1.5 text-sm">
                  Grande
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleThemeToggle}
                  aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
                  className="text-muted-foreground hover:text-foreground size-8 p-1"
                />
              }
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {theme === "dark" ? "Mode clair" : "Mode sombre"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCopyPlainText}
                  aria-label="Copier le texte brut"
                  className="text-muted-foreground hover:text-foreground size-8 p-1"
                />
              }
            >
              <Copy className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Copier le texte brut</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12",
          fontSize === "small" && "chapter-size-small",
          fontSize === "normal" && "chapter-size-normal",
          fontSize === "large" && "chapter-size-large"
        )}
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-6">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              readOnly={readOnly}
              placeholder="Titre du chapitre..."
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              className={cn(
                "chapter-main-title placeholder:text-muted-foreground/30 focus:border-primary/50 text-foreground w-full border-b border-transparent bg-transparent pb-3 font-bold tracking-tight transition-colors outline-none focus:border-b",
                fontFamily === "serif" ? "font-heading" : "font-chapter-sans"
              )}
            />
          </div>

          <div
            className={cn(
              "chapter-content",
              fontFamily === "serif" ? "font-chapter-serif" : "font-chapter-sans"
            )}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <div className="bg-card/70 border-border/60 text-muted-foreground flex shrink-0 items-center justify-between border-t px-6 py-2.5 text-xs backdrop-blur-xs select-none sm:text-sm">
        <div className="flex items-center gap-4">
          <span className="text-foreground/90 font-semibold">
            {wordCount.toLocaleString("fr-FR")} {wordCount > 1 ? "mots" : "mot"}
          </span>
          <span className="text-border">•</span>
          <span>{charCount.toLocaleString("fr-FR")} caractères</span>
          <span className="text-border">•</span>
          <span>~{computeReadingTime(wordCount)} min de lecture</span>
        </div>

        <div className="text-muted-foreground/60 hidden items-center gap-3 text-xs sm:flex">
          <span>Ctrl+B Gras</span>
          <span>•</span>
          <span>Ctrl+I Italique</span>
          <span>•</span>
          <span>Ctrl+Z Annuler</span>
        </div>
      </div>
    </div>
  );
}
