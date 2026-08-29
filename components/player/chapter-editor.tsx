"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  TextB,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
  LinkSimple,
  Image as ImageIcon,
} from "@phosphor-icons/react";

import { updateChapterContent } from "@/lib/actions/chapter-actions";
import { uploadChapterImage } from "@/lib/actions/upload-actions";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const AUTOSAVE_DELAY_MS = 1800;

export function ChapterEditor({
  chapterId,
  initialContent,
}: {
  chapterId: string;
  initialContent: string;
}) {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [linkUrl, setLinkUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false, link: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
      Image,
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setSaveState("saving");
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        updateChapterContent(chapterId, editor.getHTML()).then(() => setSaveState("saved"));
      }, AUTOSAVE_DELAY_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

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

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border p-1.5">
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Gras"
        >
          <TextB />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italique"
        >
          <TextItalic />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("strike")}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Barré"
        >
          <TextStrikethrough />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("underline")}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Souligné"
        >
          <TextUnderline />
        </Toggle>

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
                aria-label="Lien"
              />
            }
          >
            <LinkSimple />
          </PopoverTrigger>
          <PopoverContent className="flex w-64 flex-row gap-2 p-2">
            <Input
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://..."
              className="h-8"
            />
            <Button type="button" size="sm" onClick={handleSetLink}>
              OK
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
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label="Insérer une image"
        >
          <ImageIcon />
        </Button>

        <span className="text-muted-foreground ml-auto text-xs">
          {saveState === "saving" ? "Enregistrement..." : saveState === "saved" ? "Enregistré" : ""}
        </span>
      </div>

      <EditorContent
        editor={editor}
        className="chapter-content focus-within:ring-ring/50 min-h-64 rounded-lg border px-3 py-2 focus-within:ring-[3px]"
      />
    </div>
  );
}
