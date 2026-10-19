"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowCounterClockwise,
  CaretDown,
  CircleNotch,
  Copy,
  DotsThreeVertical,
  Eye,
  EyeSlash,
  Image as ImageIcon,
  PaperPlaneTilt,
  PencilSimple,
  Trash,
  X,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { uploadConversationImage } from "@/lib/actions/upload-actions";
import { validateImageFile } from "@/lib/upload-config";
import {
  editConversationMessage,
  deleteConversationMessage,
  markConversationAsRead,
} from "@/lib/actions/conversation-actions";
import type { SerializedConversationMessage } from "@/lib/services/conversation-events";
import { MessageAuthorType, TicketStatus } from "@/lib/generated/prisma/enums";
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
  disabledMessage,
  emptyBadge,
  unreadSince,
  className,
}: {
  conversationId: string;
  initialMessages: SerializedConversationMessage[];
  viewerId: string;
  viewerIsStaff: boolean;
  sendAction: (
    conversationId: string,
    body?: string,
    imageUrl?: string
  ) => Promise<{ success?: boolean; error?: string } | void>;
  disabled?: boolean;
  disabledMessage?: string;
  emptyBadge?: string;
  /** Dernière lecture du lecteur : affiche un séparateur avant le premier message plus récent. */
  unreadSince?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [firstUnreadMessageId] = useState(() => {
    if (!unreadSince) return null;
    const threshold = new Date(unreadSince).getTime();
    const firstUnread = initialMessages.find(
      (msg) => msg.authorId !== viewerId && new Date(msg.createdAt).getTime() > threshold
    );
    return firstUnread?.id ?? null;
  });
  const [isChatDisabled, setIsChatDisabled] = useState(disabled);
  const [body, setBody] = useState("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [expandedDeletedIds, setExpandedDeletedIds] = useState<Set<string>>(() => new Set());
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(() => new Set());

  function toggleDeleted(messageId: string) {
    setExpandedDeletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }

  function toggleHistory(messageId: string) {
    setExpandedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }

  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const [prevDisabled, setPrevDisabled] = useState(disabled);
  if (disabled !== prevDisabled) {
    setPrevDisabled(disabled);
    setIsChatDisabled(disabled);
  }

  useEffect(() => {
    const eventSource = new EventSource(`/api/conversations/${conversationId}/stream`);
    eventSource.onmessage = (event) => {
      try {
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
        } else if (data.type === "STATUS_CHANGE") {
          const isNowArchived = data.status === TicketStatus.ARCHIVED;
          setIsChatDisabled(isNowArchived);
          if (!viewerIsStaff) {
            toast.info(
              isNowArchived
                ? "Ce ticket a été archivé par le staff. Les réponses sont maintenant fermées."
                : "Ce ticket a été rouvert.",
              { id: "ticket-status" }
            );
          }
          router.refresh();
        } else {
          const rawMessage: SerializedConversationMessage =
            data.type === "CREATE" ? data.message : data;
          if (!viewerIsStaff && rawMessage.deletedAt) return;
          const message: SerializedConversationMessage =
            !viewerIsStaff && rawMessage.authorType === MessageAuthorType.STAFF
              ? {
                  ...rawMessage,
                  authorId: null,
                  authorName: "Staff",
                  authorMinecraftUsername: null,
                  authorAvatarUrl: "/HYORI-LOGO-COMPRESSED.jpg",
                }
              : rawMessage;
          setMessages((previous) =>
            previous.some((existing) => existing.id === message.id)
              ? previous.map((existing) => (existing.id === message.id ? message : existing))
              : [...previous, message]
          );

          if (typeof document !== "undefined" && document.visibilityState === "visible") {
            markConversationAsRead(conversationId, viewerIsStaff).catch(() => {});
          }
        }
      } catch (err) {
        console.error("[ConversationChat] Erreur lors de la réception d'un événement SSE:", err);
      }
    };
    return () => eventSource.close();
  }, [conversationId, viewerIsStaff, router]);

  useEffect(() => {
    function handleVisibilityOrFocus() {
      if (document.visibilityState === "visible") {
        markConversationAsRead(conversationId, viewerIsStaff).catch(() => {});
      }
    }

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [conversationId, viewerIsStaff]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    } else {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
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
    const validation = validateImageFile(file);
    if (!validation.valid) {
      const errorMsg = validation.error ?? "Fichier invalide.";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const { url } = await uploadConversationImage(formData, conversationId);
      setPendingImageUrl(url);
    } catch (uploadError) {
      const rawMessage =
        uploadError instanceof Error
          ? uploadError.message
          : "Une erreur est survenue lors de l'envoi de l'image.";
      const message = rawMessage.includes("unexpected response")
        ? "L'image a été rejetée par le serveur (taille trop volumineuse pour le serveur web ou timeout réseau)."
        : rawMessage;
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
    if (!isChatDisabled && !isPending && !isUploading) {
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
    if (isChatDisabled || isPending || isUploading) return;

    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await uploadFile(file);
    }
  }

  function handleSendFailure(
    errorMessage: string,
    savedBody: string,
    savedImageUrl: string | null
  ) {
    const isArchivedError = errorMessage.toLowerCase().includes("archivé");

    if (isArchivedError) {
      setIsChatDisabled(true);
      setError(null);
      toast.error("Ce ticket est archivé. Les réponses sont fermées.", { id: "ticket-status" });
      router.refresh();
    } else {
      setBody(savedBody);
      setPendingImageUrl(savedImageUrl);
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }

  function handleSubmit() {
    if ((!body.trim() && !pendingImageUrl) || isPending || isUploading || isChatDisabled) return;
    setError(null);
    const trimmedBody = body.trim() || undefined;
    const imageUrl = pendingImageUrl ?? undefined;

    const savedBody = body;
    const savedImageUrl = pendingImageUrl;

    setBody("");
    setPendingImageUrl(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    startTransition(async () => {
      try {
        const result = await sendAction(conversationId, trimmedBody, imageUrl);
        if (result && !result.success && result.error) {
          handleSendFailure(result.error, savedBody, savedImageUrl);
          return;
        }
      } catch (sendError) {
        let message =
          sendError instanceof Error
            ? sendError.message
            : "Une erreur est survenue lors de l'envoi du message.";
        if (
          message.includes("Server Components render") ||
          message.includes("omitted in production")
        ) {
          message = "Une erreur est survenue lors de l'envoi du message.";
        }
        handleSendFailure(message, savedBody, savedImageUrl);
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
        let message = err instanceof Error ? err.message : "Erreur lors de la modification.";
        if (
          message.includes("Server Components render") ||
          message.includes("omitted in production")
        ) {
          message = "Une erreur est survenue lors de la modification.";
        }
        if (message.toLowerCase().includes("archivé")) {
          setIsChatDisabled(true);
          message = "Ce ticket est archivé. Impossible de modifier ce message.";
          router.refresh();
        }
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
        let message = err instanceof Error ? err.message : "Erreur lors de la suppression.";
        if (
          message.includes("Server Components render") ||
          message.includes("omitted in production")
        ) {
          message = "Une erreur est survenue lors de la suppression.";
        }
        if (message.toLowerCase().includes("archivé")) {
          setIsChatDisabled(true);
          message = "Ce ticket est archivé. Impossible de supprimer ce message.";
          router.refresh();
        }
        setError(message);
        toast.error(message);
      }
    });
  }

  const groupedItems = useMemo(() => {
    type ChatItem =
      | { type: "system"; message: SerializedConversationMessage }
      | { type: "unread-separator" }
      | { type: "group"; group: MessageGroup };

    const items: ChatItem[] = [];
    let currentGroup: MessageGroup | null = null;

    const visibleMessages = viewerIsStaff ? messages : messages.filter((msg) => !msg.deletedAt);

    for (let i = 0; i < visibleMessages.length; i++) {
      const msg = visibleMessages[i];
      if (msg.id === firstUnreadMessageId) {
        if (currentGroup) {
          items.push({ type: "group", group: currentGroup });
          currentGroup = null;
        }
        items.push({ type: "unread-separator" });
      }
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
      const effectiveAuthorId = isStaffMessage && !viewerIsStaff ? null : msg.authorId;
      const displayName = isOwn
        ? "Moi"
        : isStaffMessage && !viewerIsStaff
          ? "Staff"
          : msg.authorName
            ? msg.authorName
            : isStaffMessage
              ? "Staff"
              : "Joueur";

      const minecraftUsername =
        isStaffMessage && !viewerIsStaff ? null : (msg.authorMinecraftUsername ?? null);
      const avatarUrl =
        isStaffMessage && !viewerIsStaff
          ? "/HYORI-LOGO-COMPRESSED.jpg"
          : (msg.authorAvatarUrl ?? (isStaffMessage ? "/HYORI-LOGO-COMPRESSED.jpg" : null));

      if (!currentGroup) {
        currentGroup = {
          id: msg.id,
          authorId: effectiveAuthorId,
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
          !viewerIsStaff && isStaffMessage && currentGroup.authorType === MessageAuthorType.STAFF
            ? true
            : currentGroup.authorId === effectiveAuthorId &&
              currentGroup.authorType === msg.authorType;

        if (sameAuthor && timeDiffMs <= 10 * 60 * 1000) {
          currentGroup.messages.push(msg);
        } else {
          items.push({ type: "group", group: currentGroup });
          currentGroup = {
            id: msg.id,
            authorId: effectiveAuthorId,
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
  }, [messages, viewerId, viewerIsStaff, firstUnreadMessageId]);

  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col gap-3", className)}>
      <div
        ref={messagesContainerRef}
        className="bg-card/30 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-xl border p-4"
      >
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

            if (item.type === "unread-separator") {
              return (
                <div
                  key="unread-separator"
                  className="text-primary flex items-center gap-3 text-xs font-medium select-none"
                >
                  <span className="bg-primary/40 h-px flex-1" />
                  <span>Nouveaux messages</span>
                  <span className="bg-primary/40 h-px flex-1" />
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
                  const isDeletedExpanded = expandedDeletedIds.has(message.id);
                  const isHistoryExpanded = expandedHistoryIds.has(message.id);
                  const hasActions = isDeleted
                    ? viewerIsStaff
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
                          viewerIsStaff && group.authorId ? (
                            <Link
                              href={`/staff/atlas/${group.authorId}`}
                              className="transition-opacity hover:opacity-80"
                              title={`Voir la fiche Atlas de ${group.displayName}`}
                            >
                              {group.authorType === MessageAuthorType.STAFF ? (
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
                              )}
                            </Link>
                          ) : group.authorType === MessageAuthorType.STAFF ? (
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
                            {viewerIsStaff && group.authorId ? (
                              <Link
                                href={`/staff/atlas/${group.authorId}`}
                                className={cn(
                                  "text-sm font-medium hover:underline",
                                  (group.displayName === "Staff" ||
                                    (group.authorType === MessageAuthorType.STAFF &&
                                      !group.isOwn)) &&
                                    "text-primary font-semibold"
                                )}
                                title={`Voir la fiche Atlas de ${group.displayName}`}
                              >
                                {group.displayName}
                              </Link>
                            ) : (
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  (group.displayName === "Staff" ||
                                    (group.authorType === MessageAuthorType.STAFF &&
                                      !group.isOwn)) &&
                                    "text-primary font-semibold"
                                )}
                              >
                                {group.displayName}
                              </span>
                            )}
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
                                {viewerIsStaff && isDeleted ? (
                                  !isDeletedExpanded ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleDeleted(message.id)}
                                      aria-expanded={false}
                                      className={cn(
                                        "group/del flex items-center gap-2 rounded-xl border border-dashed px-3 py-1.5 text-xs transition-colors cursor-pointer select-none",
                                        "border-destructive/35 bg-destructive/5 hover:bg-destructive/10 dark:bg-destructive/15 dark:hover:bg-destructive/25 text-destructive",
                                        group.isOwn ? "rounded-tr-xs" : "rounded-tl-xs"
                                      )}
                                      title="Cliquer pour afficher le message supprimé"
                                    >
                                      <Trash className="size-3.5 shrink-0 opacity-80 group-hover/del:opacity-100" />
                                      <span className="font-medium">Message supprimé</span>
                                      <span className="text-muted-foreground/80 font-normal text-[11px]">
                                        {message.deletedAt
                                          ? `(${formatShortTime(message.deletedAt)})`
                                          : `(${formatShortTime(message.createdAt)})`}
                                      </span>
                                      <span className="bg-destructive/15 text-destructive group-hover/del:bg-destructive/25 dark:bg-destructive/25 dark:group-hover/del:bg-destructive/35 ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium transition-colors">
                                        <Eye className="size-3" />
                                        <span>Afficher</span>
                                      </span>
                                    </button>
                                  ) : (
                                    <div
                                      className={cn(
                                        "border-destructive/40 bg-destructive/5 dark:bg-destructive/15 text-muted-foreground rounded-2xl border border-dashed p-3 text-sm leading-relaxed shadow-2xs transition-all animate-in fade-in-50 duration-150",
                                        group.isOwn ? "rounded-tr-xs" : "rounded-tl-xs"
                                      )}
                                    >
                                      <div className="flex items-center justify-between gap-3 border-b border-destructive/20 pb-2 mb-2 select-none">
                                        <div className="flex items-center gap-1.5 text-destructive text-xs font-medium">
                                          <Trash className="size-3.5 shrink-0" />
                                          <span>Message supprimé</span>
                                          <span className="text-muted-foreground font-normal text-[11px]">
                                            {message.deletedAt
                                              ? `le ${formatDate(message.deletedAt, { style: "chat" })}`
                                              : `(envoyé à ${formatShortTime(message.createdAt)})`}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => toggleDeleted(message.id)}
                                          aria-expanded={true}
                                          className="text-destructive/80 hover:text-destructive bg-destructive/10 hover:bg-destructive/20 dark:bg-destructive/25 dark:hover:bg-destructive/35 flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer"
                                          title="Masquer le contenu supprimé"
                                        >
                                          <EyeSlash className="size-3" />
                                          <span>Masquer</span>
                                        </button>
                                      </div>

                                      {message.body && (
                                        <p className="italic text-foreground/90 break-words whitespace-pre-wrap">
                                          {message.body}
                                        </p>
                                      )}
                                      {message.imageUrl && (
                                        <img
                                          src={message.imageUrl}
                                          alt="Image supprimée"
                                          className={cn(
                                            "border-destructive/30 max-h-64 max-w-full rounded-lg border border-dashed object-contain opacity-85",
                                            message.body && "mt-2"
                                          )}
                                        />
                                      )}

                                      {message.versions && message.versions.length > 0 && (
                                        <div className="mt-2.5 border-t border-destructive/20 pt-2">
                                          <button
                                            type="button"
                                            onClick={() => toggleHistory(message.id)}
                                            aria-expanded={isHistoryExpanded}
                                            className="text-destructive/80 hover:text-destructive flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
                                          >
                                            <ArrowCounterClockwise className="size-3" />
                                            <span>
                                              {isHistoryExpanded
                                                ? "Masquer les versions antérieures"
                                                : `Voir les versions antérieures (${message.versions.length})`}
                                            </span>
                                            <CaretDown
                                              className={cn(
                                                "size-2.5 transition-transform duration-200",
                                                isHistoryExpanded && "rotate-180"
                                              )}
                                            />
                                          </button>

                                          {isHistoryExpanded && (
                                            <div className="mt-2 flex flex-col gap-1.5 pl-2 border-l-2 border-destructive/30">
                                              {message.versions.map((version, vIdx) => (
                                                <div
                                                  key={version.id}
                                                  className="rounded-lg bg-background/60 p-2 text-xs border border-destructive/20"
                                                >
                                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono mb-1">
                                                    <span className="font-semibold text-foreground/80 font-sans">
                                                      {vIdx === 0 ? "Version initiale" : `Version ${vIdx + 1}`}
                                                    </span>
                                                    <span>
                                                      {version.createdAt ? formatDate(version.createdAt, { style: "chat" }) : ""}
                                                    </span>
                                                  </div>
                                                  <p className="text-xs break-words whitespace-pre-wrap leading-relaxed text-foreground/85 italic">
                                                    {version.body}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
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
                                          "mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium select-none",
                                          group.isOwn
                                            ? "text-primary-foreground/75"
                                            : "text-muted-foreground/80"
                                        )}
                                      >
                                        <div className="flex items-center gap-1">
                                          <PencilSimple className="size-3 shrink-0" />
                                          <span>
                                            Modifié
                                            {message.updatedAt
                                              ? ` (${formatDate(message.updatedAt, { style: "chat" })})`
                                              : ""}
                                          </span>
                                        </div>

                                        {viewerIsStaff && message.versions && message.versions.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleHistory(message.id);
                                            }}
                                            aria-expanded={isHistoryExpanded}
                                            className={cn(
                                              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium transition-colors cursor-pointer",
                                              group.isOwn
                                                ? isHistoryExpanded
                                                  ? "bg-primary-foreground/25 text-primary-foreground underline"
                                                  : "bg-primary-foreground/15 text-primary-foreground/90 hover:bg-primary-foreground/25"
                                                : isHistoryExpanded
                                                  ? "bg-foreground/15 text-foreground underline"
                                                  : "bg-background/80 text-foreground/80 hover:bg-background hover:text-foreground border border-border/50"
                                            )}
                                            title={
                                              isHistoryExpanded
                                                ? "Masquer l'historique des modifications"
                                                : "Afficher l'historique des modifications"
                                            }
                                          >
                                            <ArrowCounterClockwise className="size-3 shrink-0" />
                                            <span>
                                              {isHistoryExpanded
                                                ? "Masquer l'historique"
                                                : `Historique (${message.versions.length})`}
                                            </span>
                                            <CaretDown
                                              className={cn(
                                                "size-2.5 transition-transform duration-200",
                                                isHistoryExpanded && "rotate-180"
                                              )}
                                            />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {viewerIsStaff &&
                                  !isDeleted &&
                                  isHistoryExpanded &&
                                  message.versions &&
                                  message.versions.length > 0 && (
                                    <div
                                      className={cn(
                                        "my-1 flex w-full flex-col gap-2 rounded-xl border border-dashed p-3 text-xs shadow-2xs animate-in fade-in-50 duration-150",
                                        group.isOwn
                                          ? "border-primary/40 bg-primary/10 text-foreground"
                                          : "border-border/70 bg-muted/60 text-foreground"
                                      )}
                                    >
                                      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5 text-[11px] font-medium text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                          <ArrowCounterClockwise className="size-3.5 text-primary shrink-0" />
                                          <span className="font-semibold text-foreground/90">
                                            Historique des modifications ({message.versions.length} version{message.versions.length > 1 ? "s" : ""} antérieure{message.versions.length > 1 ? "s" : ""})
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => toggleHistory(message.id)}
                                          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] hover:underline cursor-pointer"
                                          title="Fermer l'historique"
                                        >
                                          <EyeSlash className="size-3" />
                                          <span>Fermer</span>
                                        </button>
                                      </div>

                                      <div className="flex flex-col gap-2 pt-0.5">
                                        {message.versions.map((version, vIdx) => (
                                          <div
                                            key={version.id}
                                            className="flex flex-col gap-1 rounded-lg bg-background/80 p-2.5 border border-border/40 shadow-2xs"
                                          >
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                              <span className="font-medium text-foreground/80 flex items-center gap-1.5">
                                                <span className="size-1.5 rounded-full bg-primary/70 shrink-0" />
                                                {vIdx === 0 ? "Version initiale" : `Version ${vIdx + 1}`}
                                              </span>
                                              <span className="font-mono text-[10px]">
                                                {version.createdAt ? formatDate(version.createdAt, { style: "chat" }) : ""}
                                              </span>
                                            </div>
                                            <p className="text-sm break-words whitespace-pre-wrap leading-relaxed text-foreground/90 pl-3 border-l-2 border-primary/30">
                                              {version.body}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </div>

                              {!isChatDisabled && hasActions && (
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
                                    {viewerIsStaff && isDeleted && (
                                      <DropdownMenuItem onClick={() => toggleDeleted(message.id)}>
                                        {isDeletedExpanded ? (
                                          <>
                                            <EyeSlash className="size-3.5" />
                                            <span>Masquer le message supprimé</span>
                                          </>
                                        ) : (
                                          <>
                                            <Eye className="size-3.5" />
                                            <span>Afficher le message supprimé</span>
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                    )}
                                    {viewerIsStaff &&
                                      !isDeleted &&
                                      message.versions &&
                                      message.versions.length > 0 && (
                                        <DropdownMenuItem onClick={() => toggleHistory(message.id)}>
                                          <ArrowCounterClockwise className="size-3.5" />
                                          <span>
                                            {isHistoryExpanded
                                              ? "Masquer l'historique"
                                              : "Historique des modifications"}
                                          </span>
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
        <div className="bg-destructive/10 text-destructive border-destructive/20 flex shrink-0 items-center justify-between rounded-lg border px-3 py-2 text-xs">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-2 hover:opacity-70">
            <X className="size-3" />
          </button>
        </div>
      )}

      {isChatDisabled ? (
        <div className="bg-muted/30 text-muted-foreground border-border/60 flex shrink-0 items-center justify-center rounded-xl border border-dashed px-4 py-3.5 text-center text-xs font-medium select-none">
          <span>
            {disabledMessage ?? "Cette conversation est archivée. Les réponses sont fermées."}
          </span>
        </div>
      ) : (
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
