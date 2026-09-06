"use client";

import { useSyncExternalStore } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  TextB,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
  ListBullets,
  ListNumbers,
  TextHOne,
  TextHTwo,
  TextHThree,
} from "@phosphor-icons/react";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const emptySubscribe = () => () => {};

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        underline: false,
        codeBlock: false,
        code: false,
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
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert focus:outline-none min-h-[200px] p-4 max-w-none",
      },
    },
    immediatelyRender: false,
  });

  if (!editor || !mounted) return null;

  return (
    <div className={cn("border-border bg-background overflow-hidden rounded-md border", className)}>
      <div className="bg-muted/50 border-border flex shrink-0 flex-wrap items-center gap-1 border-b px-3 py-2">
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
          pressed={editor.isActive("heading", { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          aria-label="Titre 1"
          className="size-8 p-1"
        >
          <TextHOne className="size-4" />
        </Toggle>
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
          pressed={editor.isActive("heading", { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Titre 3"
          className="size-8 p-1"
        >
          <TextHThree className="size-4" />
        </Toggle>

        <div className="bg-border/60 mx-1 h-5 w-px" />

        <Toggle
          size="sm"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Liste à puces"
          className="size-8 p-1"
        >
          <ListBullets className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("orderedList")}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Liste numérotée"
          className="size-8 p-1"
        >
          <ListNumbers className="size-4" />
        </Toggle>
      </div>
      <EditorContent
        editor={editor}
        className="cursor-text"
        onClick={() => editor.commands.focus()}
      />
    </div>
  );
}
