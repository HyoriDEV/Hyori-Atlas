"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CircleNotch,
  Copy,
  DotsThreeVertical,
  Image as ImageIcon,
  PaperPlaneTilt,
  PencilSimple,
  Trash,
  X,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { uploadConversationImage } from "@/lib/actions/upload-actions";
import {
  editConversationMessage,
  deleteConversationMessage,
} from "@/lib/actions/conversation-actions";
import type { SerializedConversationMessage } from "@/lib/services/conversation-events";
import { MessageAuthorType } from "@/lib/generated/prisma/enums";
import { formatDate, formatShortTime } from "@/lib/date";
import { SkinHead } from "@/components/ui/skin-head";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MessageGroup {
  id: string;
  authorId: string | null;
  authorType: MessageAuthorType;
  displayName: string;
  minecraftUsername: string | null;
  avatarUrl: string | null;
  isOwn: boolean;
  messages: SerializedConversationMessage[];
}

export function ConversationChat({
  conversationId,
  initialMessages,
  viewerId,
  viewerIsStaff,
  sendAction,
  disabled = false,
  emptyBadge,
  className,
}: {
  conversationId: string;
  initialMessages: SerializedConversationMessage[];
  viewerId: string;
  viewerIsStaff: boolean;
  sendAction: (conversationId: string, body?: string, imageUrl?: string) => Promise<void>;
  disabled?: boolean;
  emptyBadge?: string;
  className?: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/conversations/${conversationId}/stream`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "DELETE") {
        if (viewerIsStaff) {
          setMessages((previous) =>
            previous.map((msg) =>
              msg.id === data.messageId
                ? { ...msg, deletedAt: data.deletedAt || new Date().toISOString() }
                : msg
            )
          );
        } else {
          setMessages((previous) => previous.filter((msg) => msg.id !== data.messageId));
        }
      } else if (data.type === "UPDATE") {
        setMessages((previous) =>
          previous.map((msg) => {
            if (msg.id !== data.message.id) return msg;
            if (!viewerIsStaff) {
              return {
                ...data.message,
                versions: undefined,
                deletedAt: null,
                isEdited: data.message.isEdited ?? Boolean(data.message.versions?.length),
              };
            }
            return data.message;
          })
        );
      } else {
        const message: SerializedConversationMessage = data.type === "CREATE" ? data.message : data;
        if (!viewerIsStaff && message.deletedAt) return;
        setMessages((previous) =>
          previous.some((existing) => existing.id === message.id)
            ? previous.map((existing) => (existing.id === message.id ? message : existing))
            : [...previous, message]
        );
      }
    };
    return () => eventSource.close();
  }, [conversationId, viewerIsStaff]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [body]);

  function resolveLinkHref(linkHref: string) {
    if (!viewerIsStaff && linkHref.startsWith("/staff/tickets/")) {
      return linkHref.replace("/staff/tickets/", "/player/tickets/");
    }
    return linkHref;
  }

  async function uploadFile(file: File) {
    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const { url } = await uploadConversationImage(formData, conversationId);
      setPendingImageUrl(url);
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Une erreur est survenue lors de l'envoi de l'image.";
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadFile(file);
  }

  async function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          await uploadFile(file);
          break;
        }
      }
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    if (!disabled && !isPending && !isUploading) {
      setIsDragOver(true);
    }
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
  }

  async function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled || isPending || isUploading) return;

    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await uploadFile(file);
    }
  }

  function handleSubmit() {
    if ((!body.trim() && !pendingImageUrl) || isPending || isUploading) return;
    setError(null);
    const trimmedBody = body.trim() || undefined;
    const imageUrl = pendingImageUrl ?? undefined;

    setBody("");
    setPendingImageUrl(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }

    startTransition(async () => {
      try {
        await sendAction(conversationId, trimmedBody, imageUrl);
      } catch (sendError) {
        const message = sendError instanceof Error ? sendError.message : "Une erreur est survenue.";
        setError(message);
        toast.error(message);
      } finally {
        textareaRef.current?.focus();
      }
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      handleSubmit();
    }
  }

  async function handleCopy(text: string | null) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copié dans le presse-papiers");
    } catch {
      toast.error("Impossible de copier le message.");
    }
  }

  function handleStartEdit(message: SerializedConversationMessage) {
    setEditingId(message.id);
    setEditBody(message.body ?? "");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditBody("");
  }

  function handleSaveEdit(messageId: string) {
    if (!editBody.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await editConversationMessage(messageId, editBody.trim());
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, body: editBody.trim(), isEdited: true } : m
          )
        );
        setEditingId(null);
        setEditBody("");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de la modification.";
        setError(message);
        toast.error(message);
      }
    });
  }

  function handleDeleteMessage(messageId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteConversationMessage(messageId);
        if (viewerIsStaff) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m
            )
          );
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
        toast.success("Message supprimé.");
        setDeletingMessageId(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de la suppression.";
        setError(message);
        toast.error(message);
      }
    });
  }

  const groupedItems = useMemo(() => {
    type ChatItem =
      | { type: "system"; message: SerializedConversationMessage }
      | { type: "group"; group: MessageGroup };

    const items: ChatItem[] = [];
    let currentGroup: MessageGroup | null = null;

    const visibleMessages = viewerIsStaff ? messages : messages.filter((msg) => !msg.deletedAt);

    for (let i = 0; i < visibleMessages.length; i++) {
      const msg = visibleMessages[i];
      if (msg.authorType === MessageAuthorType.SYSTEM) {
        if (currentGroup) {
          items.push({ type: "group", group: currentGroup });
          currentGroup = null;
        }
        items.push({ type: "system", message: msg });
        continue;
      }

      const isOwn = msg.authorId === viewerId;
      const isStaffMessage = msg.authorType === MessageAuthorType.STAFF;
      const displayName = isOwn
        ? "Moi"
        : isStaffMessage && !viewerIsStaff
          ? "Staff"
          : msg.authorName
            ? msg.authorName
            : isStaffMessage
              ? "Staff"
              : "Joueur";

      const minecraftUsername = isStaffMessage ? null : (msg.authorMinecraftUsername ?? null);
      const avatarUrl = isStaffMessage ? "/HYORI-LOGO-COMPRESSED.jpg" : msg.authorAvatarUrl;

      if (!currentGroup) {
        currentGroup = {
          id: msg.id,
          authorId: msg.authorId,
          authorType: msg.authorType,
          displayName,
          minecraftUsername,
          avatarUrl,
          isOwn,
          messages: [msg],
        };
      } else {
        const prevMsg = currentGroup.messages[currentGroup.messages.length - 1];
        const prevTime = new Date(prevMsg.createdAt).getTime();
        const currTime = new Date(msg.createdAt).getTime();
        const timeDiffMs = currTime - prevTime;
        const sameAuthor =
          currentGroup.authorId === msg.authorId && currentGroup.authorType === msg.authorType;

        if (sameAuthor && timeDiffMs <= 10 * 60 * 1000) {
          currentGroup.messages.push(msg);
        } else {
          items.push({ type: "group", group: currentGroup });
          currentGroup = {
            id: msg.id,
            authorId: msg.authorId,
            authorType: msg.authorType,
            displayName,
            minecraftUsername,
            avatarUrl,
            isOwn,
            messages: [msg],
          };
        }
      }
    }

    if (currentGroup) {
      items.push({ type: "group", group: currentGroup });
    }

    return items;
  }, [messages, viewerId, viewerIsStaff]);

  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col gap-3", className)}>
      <div className="bg-card/30 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-xl border p-4">
        {emptyBadge && (
          <div className="text-muted-foreground bg-muted/70 border-border/50 mx-auto my-1 flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-medium">
            <span>{emptyBadge}</span>
          </div>
        )}
        {messages.length === 0 && !emptyBadge ? (
          <p className="text-muted-foreground m-auto text-sm">Aucun message pour l&apos;instant.</p>
        ) : (
          groupedItems.map((item) => {
            if (item.type === "system") {
              const message = item.message;
              return (
                <div
                  key={message.id}
                  className="text-muted-foreground bg-muted/70 border-border/50 mx-auto my-1 flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-medium"
                >
                  <span>{message.body}</span>
                  {message.linkHref && (
                    <Link
                      href={resolveLinkHref(message.linkHref)}
                      className="text-primary font-medium hover:underline"
                    >
                      {message.linkLabel ?? "Voir"}
                    </Link>
                  )}
                </div>
              );
            }

            const group = item.group;
            return (
              <div
                key={group.id}
                className={cn(
                  "flex w-full flex-col gap-1",
                  group.isOwn ? "items-end" : "items-start"
                )}
              >
                {group.messages.map((message, msgIndex) => {
                  const isFirst = msgIndex === 0;
                  const isEditing = editingId === message.id;
                  const isDeleted = Boolean(message.deletedAt);
                  const hasActions = isDeleted
                    ? Boolean(message.body?.trim())
                    : Boolean(message.body?.trim()) || group.isOwn;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "group/msg-row flex w-full max-w-[85%] gap-3",
                        isFirst ? "items-start" : "items-center",
                        group.isOwn && "flex-row-reverse"
                      )}
                    >
                      <div
                        className={cn(
                          "flex w-8 shrink-0 items-center justify-center",
                          !isFirst && "my-auto self-center"
                        )}
                      >
                        {isFirst ? (
                          group.authorType === MessageAuthorType.STAFF ? (
                            <Avatar size="sm">
                              <AvatarImage
                                src={group.avatarUrl ?? undefined}
                                alt={group.displayName}
                              />
                              <AvatarFallback>
                                {group.displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : group.minecraftUsername ? (
                            <SkinHead size="sm" username={group.minecraftUsername} />
                          ) : (
                            <Avatar size="sm">
                              <AvatarImage
                                src={group.avatarUrl ?? undefined}
                                alt={group.displayName}
                              />
                              <AvatarFallback>
                                {group.displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )
                        ) : (
                          <span className="text-muted-foreground/60 flex items-center justify-center font-mono text-[10px] opacity-0 transition-opacity select-none group-hover/msg-row:opacity-100">
                            <span>{formatShortTime(message.createdAt)}</span>
                          </span>
                        )}
                      </div>

                      <div
                        className={cn(
                          "flex max-w-full min-w-0 flex-col gap-1",
                          group.isOwn && "items-end"
                        )}
                      >
                        {isFirst && (
                          <div
                            className={cn(
                              "flex items-baseline gap-2",
                              group.isOwn && "flex-row-reverse"
                            )}
                          >
                            <span
                              className={cn(
                                "text-sm font-medium",
                                (group.displayName === "Staff" ||
                                  (group.authorType === MessageAuthorType.STAFF && !group.isOwn)) &&
                                  "text-primary font-semibold"
                              )}
                            >
                              {group.displayName}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {formatDate(message.createdAt, { style: "chat" })}
                            </span>
                          </div>
                        )}

                        <div
                          className={cn(
                            "flex max-w-full items-center gap-1.5",
                            group.isOwn ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          {isEditing ? (
                            <div className="bg-card flex max-w-full min-w-[280px] flex-col overflow-hidden rounded-xl border shadow-xs">
                              <div className="p-3 pb-2">
                                <textarea
                                  value={editBody}
                                  onChange={(e) => setEditBody(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") handleCancelEdit();
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveEdit(message.id);
                                    }
                                  }}
                                  rows={2}
                                  className="placeholder:text-muted-foreground/60 w-full resize-none border-0 bg-transparent p-0 text-sm outline-none focus:outline-none"
                                  autoFocus
                                />
                              </div>
                              <div className="border-border/40 bg-muted/15 flex items-center justify-between gap-2 border-t px-3 py-2">
                                <span className="text-muted-foreground/60 text-[11px]">
                                  Échap pour annuler · Entrée pour enregistrer
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    disabled={isPending}
                                  >
                                    Annuler
                                  </Button>
                                  <Button
                                    type="button"
                                    size="xs"
                                    onClick={() => handleSaveEdit(message.id)}
                                    disabled={isPending || !editBody.trim()}
                                  >
                                    {isPending ? (
                                      <CircleNotch className="size-3 animate-spin" />
                                    ) : (
                                      "Enregistrer"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex max-w-full flex-col gap-1">
                                {viewerIsStaff &&
                                  message.versions &&
                                  message.versions.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                      {message.versions.map((version, vIdx) => (
                                        <div
                                          key={version.id}
                                          className={cn(
                                            "rounded-2xl border border-dashed px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-2xs",
                                            group.isOwn
                                              ? "bg-primary/20 text-foreground border-primary/40 rounded-tr-xs"
                                              : "bg-muted/45 text-foreground border-border/60 rounded-tl-xs"
                                          )}
                                        >
                                          <p>{version.body}</p>
                                          <div className="text-muted-foreground/80 mt-1 flex items-center gap-1.5 text-[11px] font-medium select-none">
                                            <PencilSimple className="size-3 shrink-0" />
                                            <span>
                                              {vIdx === 0
                                                ? "Version initiale"
                                                : `Version ${vIdx + 1}`}
                                              {version.createdAt
                                                ? ` (${formatDate(version.createdAt, { style: "chat" })})`
                                                : ""}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                {viewerIsStaff && isDeleted ? (
                                  <div
                                    className={cn(
                                      "border-destructive/40 bg-destructive/5 dark:bg-destructive/10 text-muted-foreground rounded-2xl border border-dashed px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-2xs",
                                      group.isOwn ? "rounded-tr-xs" : "rounded-tl-xs"
                                    )}
                                  >
                                    {message.body && <p className="italic">{message.body}</p>}
                                    {message.imageUrl && (
                                      <img
                                        src={message.imageUrl}
                                        alt=""
                                        className={cn(
                                          "border-destructive/30 max-h-64 max-w-full rounded-lg border border-dashed object-contain opacity-75",
                                          message.body && "mt-1.5"
                                        )}
                                      />
                                    )}
                                    <div className="text-destructive/80 mt-1 flex items-center gap-1.5 text-[11px] font-medium select-none">
                                      <Trash className="size-3 shrink-0" />
                                      <span>
                                        Message supprimé
                                        {message.deletedAt
                                          ? ` (${formatDate(message.deletedAt, { style: "chat" })})`
                                          : ""}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className={cn(
                                      "rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-2xs",
                                      group.isOwn
                                        ? "bg-primary text-primary-foreground rounded-tr-xs"
                                        : "bg-muted/80 border-border/40 rounded-tl-xs border"
                                    )}
                                  >
                                    {message.body && <p>{message.body}</p>}
                                    {message.imageUrl && (
                                      <img
                                        src={message.imageUrl}
                                        alt=""
                                        className={cn(
                                          "max-h-64 max-w-full rounded-lg border object-contain",
                                          message.body && "mt-1.5"
                                        )}
                                      />
                                    )}
                                    {message.isEdited && (
                                      <div
                                        className={cn(
                                          "mt-1 flex items-center gap-1.5 text-[11px] font-medium select-none",
                                          group.isOwn
                                            ? "text-primary-foreground/75"
                                            : "text-muted-foreground/80"
                                        )}
                                      >
                                        <PencilSimple className="size-3 shrink-0" />
                                        <span>
                                          Modifié
                                          {message.updatedAt
                                            ? ` (${formatDate(message.updatedAt, { style: "chat" })})`
                                            : ""}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {!disabled && hasActions && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        className="text-muted-foreground hover:text-foreground h-6 w-6 rounded-md opacity-0 transition-opacity group-hover/msg-row:opacity-100 data-popup-open:opacity-100"
                                        title="Options du message"
                                      />
                                    }
                                  >
                                    <DotsThreeVertical className="size-3.5" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align={group.isOwn ? "end" : "start"}
                                    side="top"
                                    sideOffset={4}
                                  >
                                    {message.body?.trim() && (
                                      <DropdownMenuItem onClick={() => handleCopy(message.body)}>
                                        <Copy className="size-3.5" />
                                        <span>Copier</span>
                                      </DropdownMenuItem>
                                    )}
                                    {group.isOwn && !isDeleted && (
                                      <>
                                        {message.body?.trim() && (
                                          <DropdownMenuItem
                                            onClick={() => handleStartEdit(message)}
                                          >
                                            <PencilSimple className="size-3.5" />
                                            <span>Modifier</span>
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onClick={() => setDeletingMessageId(message.id)}
                                        >
                                          <Trash className="size-3.5" />
                                          <span>Supprimer</span>
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border-destructive/20 flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-2 hover:opacity-70">
            <X className="size-3" />
          </button>
        </div>
      )}

      {!disabled && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "bg-card relative flex shrink-0 flex-col overflow-hidden rounded-xl border shadow-xs transition-all",
            isDragOver && "border-primary/80 ring-primary/30 bg-primary/5 ring-2"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileSelected}
            disabled={isPending || isUploading}
          />

          <div className="flex flex-col p-3 pb-2">
            {pendingImageUrl && (
              <div className="relative mb-2 w-fit">
                <img
                  src={pendingImageUrl}
                  alt="Aperçu"
                  className="max-h-28 rounded-lg border object-cover shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setPendingImageUrl(null)}
                  className="bg-background/90 hover:bg-background text-foreground absolute -top-2 -right-2 rounded-full border p-1 shadow-xs transition-transform hover:scale-110"
                  title="Supprimer l'image"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}

            {isUploading && (
              <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs">
                <CircleNotch className="text-primary size-3.5 animate-spin" />
                <span>Téléversement de l&apos;image en cours...</span>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Écrire un message..."
              rows={1}
              className="placeholder:text-muted-foreground/60 max-h-[160px] min-h-[38px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed outline-none focus:outline-none focus-visible:ring-0 md:text-sm"
              disabled={isUploading}
            />
          </div>

          <div className="border-border/40 bg-muted/15 flex items-center justify-between gap-2 border-t px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending || isUploading}
                title="Joindre une image"
              >
                <ImageIcon className="size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-muted-foreground/50 hidden text-[11px] select-none sm:inline-block">
                <kbd className="font-sans">Entrée</kbd> pour envoyer ·{" "}
                <kbd className="font-sans">Maj + Entrée</kbd> pour saut de ligne
              </span>

              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-3 font-medium"
                onClick={handleSubmit}
                disabled={isPending || isUploading || (!body.trim() && !pendingImageUrl)}
              >
                {isPending ? (
                  <CircleNotch className="size-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Envoyer</span>
                    <PaperPlaneTilt className="size-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={deletingMessageId !== null}
        onOpenChange={(open) => !open && setDeletingMessageId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le message</AlertDialogTitle>
            <AlertDialogDescription>
              Ce message sera définitivement supprimé pour tous les participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (deletingMessageId) {
                  handleDeleteMessage(deletingMessageId);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
