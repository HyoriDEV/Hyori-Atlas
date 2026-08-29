"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { CaretUpDown, Check, User, Users, X } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { RegistrationStatus, Role } from "@/lib/generated/prisma/enums";
import { registrationStatusLabels } from "@/lib/navigation";
import { registrationStatusBadgeVariant } from "@/lib/atlas-status";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SkinHead } from "@/components/ui/skin-head";

export interface PlayerOption {
  id: string; // CUID
  characterName?: string | null;
  characterSheet?: { name?: string | null } | null;
  minecraftUsername?: string | null;
  discordDisplayName?: string | null;
  discordUsername?: string | null;
  discordAvatarUrl?: string | null;
  role?: Role | string | null;
  registrationStatus?: RegistrationStatus | string | null;
}

/**
 * Returns the character's RP name from the character sheet if available.
 */
export function getPlayerRpName(
  player: Pick<PlayerOption, "characterName" | "characterSheet">
): string | null {
  return player.characterName || player.characterSheet?.name || null;
}

/**
 * Returns the player's account name: Minecraft username if available, otherwise Discord display name (or username).
 */
export function getPlayerAccountName(
  player: Pick<PlayerOption, "minecraftUsername" | "discordDisplayName" | "discordUsername">
): string {
  return (
    player.minecraftUsername ||
    player.discordDisplayName ||
    player.discordUsername ||
    "Joueur inconnu"
  );
}

/**
 * Primary display name: Character RP Name if present, otherwise Minecraft/Discord account name.
 */
export function getPlayerDisplayName(player: PlayerOption): string {
  const rpName = getPlayerRpName(player);
  if (rpName) return rpName;
  return getPlayerAccountName(player);
}

/**
 * Secondary subtitle text: Minecraft/Discord account name when RP name is shown.
 */
export function getPlayerSecondaryName(player: PlayerOption): string | null {
  const rpName = getPlayerRpName(player);
  const accountName = getPlayerAccountName(player);

  if (rpName && accountName && rpName.toLowerCase() !== accountName.toLowerCase()) {
    return accountName;
  }

  if (
    !rpName &&
    player.minecraftUsername &&
    player.discordDisplayName &&
    player.minecraftUsername.toLowerCase() !== player.discordDisplayName.toLowerCase()
  ) {
    return player.discordDisplayName;
  }

  return null;
}

export type PlayerSortBy = "name" | "status" | "role" | "none";
export type PlayerSortDirection = "asc" | "desc";

export interface PlayerSelectBaseProps {
  /** List of all players to pick from */
  players: PlayerOption[];

  /**
   * Whether to include players with registrationStatus === REJECTED.
   * @default false (rejected players are filtered out by default)
   */
  includeRejected?: boolean;

  /** Whitelist of registration statuses to display */
  allowedStatuses?: (RegistrationStatus | string)[];

  /** Blacklist of registration statuses to exclude */
  excludedStatuses?: (RegistrationStatus | string)[];

  /** Whitelist of roles to display */
  allowedRoles?: (Role | string)[];

  /** Blacklist of roles to exclude */
  excludedRoles?: (Role | string)[];

  /** IDs of players that should be completely omitted from the list */
  excludedIds?: string[];

  /** IDs of players that are visible but disabled/unselectable */
  disabledIds?: string[];

  /** Reason text or resolver shown next to disabled players (e.g. "Déjà membre") */
  disabledItemReason?: string | ((player: PlayerOption) => string | undefined);

  /** Custom filter predicate */
  filterFn?: (player: PlayerOption) => boolean;

  /** Sort field. @default "name" */
  sortBy?: PlayerSortBy;

  /** Sort direction. @default "asc" */
  sortDirection?: PlayerSortDirection;

  /** Custom sort comparator */
  sortFn?: (a: PlayerOption, b: PlayerOption) => number;

  /** Custom search query placeholder */
  searchPlaceholder?: string;

  /** Text displayed when no players match the search query */
  emptyText?: string;

  /** Trigger placeholder when nothing is selected */
  placeholder?: string;

  /** Disable the entire select component */
  disabled?: boolean;

  /** Whether a clear (X) button is shown in the trigger */
  clearable?: boolean;

  /** Whether to show the top summary bar in multi-select mode @default true */
  showSummaryBar?: boolean;

  /** Whether to show the "Tout désélectionner" action in multi-select mode @default true */
  showClearAll?: boolean;

  /** Whether to show a registration status badge next to player names in the list */
  showStatusBadges?: boolean;

  /** Popover placement alignment */
  align?: "start" | "center" | "end";

  /** Popover placement side */
  side?: "top" | "bottom" | "left" | "right";

  /** Custom width/classes for the popover content */
  popoverClassName?: string;

  /** Custom classes for the default trigger button */
  triggerClassName?: string;

  /** Custom trigger element or render function */
  renderTrigger?:
    | React.ReactElement
    | ((props: {
        selectedPlayers: PlayerOption[];
        selectedIds: string[];
        isOpen: boolean;
        clear: () => void;
      }) => React.ReactElement);

  /** Controlled open state for the popover */
  open?: boolean;

  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;

  /** Whether to close popover upon selection */
  closeOnSelect?: boolean;
}

export interface PlayerSingleSelectProps extends PlayerSelectBaseProps {
  multiple?: false;
  /** Selected player CUID (controlled) */
  value?: string | null;
  /** Default selected player CUID (uncontrolled) */
  defaultValue?: string | null;
  /** Callback fired when selection changes */
  onChange?: (selectedId: string | null, selectedPlayer: PlayerOption | null) => void;
  /** Alias for onChange */
  onValueChange?: (selectedId: string | null, selectedPlayer: PlayerOption | null) => void;
  /** Callback fired whenever a player row is clicked */
  onSelectPlayer?: (player: PlayerOption) => void;
}

export interface PlayerMultiSelectProps extends PlayerSelectBaseProps {
  multiple: true;
  /** Selected player CUIDs (controlled) */
  value?: string[];
  /** Default selected player CUIDs (uncontrolled) */
  defaultValue?: string[];
  /** Callback fired when selection changes */
  onChange?: (selectedIds: string[], selectedPlayers: PlayerOption[]) => void;
  /** Alias for onChange */
  onValueChange?: (selectedIds: string[], selectedPlayers: PlayerOption[]) => void;
  /** Callback fired whenever a player selection is toggled */
  onTogglePlayer?: (player: PlayerOption, isSelected: boolean) => void;
  /** Maximum number of players that can be selected */
  maxSelected?: number;
}

export type PlayerSelectProps = PlayerSingleSelectProps | PlayerMultiSelectProps;

/**
 * Reusable compact row item for a player in the list.
 */
export function PlayerSelectItem({
  player,
  isSelected,
  isDisabled,
  disabledReason,
  showStatusBadge = false,
  showCheck = true,
  onSelect,
}: {
  player: PlayerOption;
  isSelected: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
  showStatusBadge?: boolean;
  showCheck?: boolean;
  onSelect: () => void;
}) {
  const displayName = getPlayerDisplayName(player);
  const secondaryName = getPlayerSecondaryName(player);
  const rpName = getPlayerRpName(player);
  const accountName = getPlayerAccountName(player);

  // Mots-clés de recherche : uniquement nom RP, pseudo Minecraft, nom d'affichage Discord, tag Discord
  const searchKeywords = [
    rpName ?? "",
    accountName,
    player.minecraftUsername ?? "",
    player.discordDisplayName ?? "",
    player.discordUsername ? `@${player.discordUsername}` : "",
    player.discordUsername ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <CommandItem
      value={`${player.id} ${searchKeywords}`}
      disabled={isDisabled}
      onSelect={onSelect}
      className={cn(
        "flex min-h-7 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors",
        isSelected && "bg-accent/70 text-accent-foreground font-medium",
        isDisabled && "cursor-not-allowed opacity-50"
      )}
    >
      {/* Minecraft 2D Skin Head with Discord avatar fallback */}
      <div className="relative flex shrink-0 items-center">
        {player.minecraftUsername ? (
          <SkinHead size="sm" username={player.minecraftUsername} className="size-5 rounded-md" />
        ) : player.discordAvatarUrl ? (
          <Avatar size="sm" className="size-5 rounded-md">
            <AvatarImage src={player.discordAvatarUrl} alt={displayName} />
            <AvatarFallback className="rounded-md text-[9px]">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="bg-muted text-muted-foreground flex size-5 items-center justify-center rounded-md text-[9px] font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Player Names & Info */}
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-foreground truncate text-xs font-medium">{displayName}</span>
          {showStatusBadge && player.registrationStatus && (
            <Badge
              variant={registrationStatusBadgeVariant(
                player.registrationStatus as RegistrationStatus
              )}
              className="h-3.5 shrink-0 px-1 py-0 text-[8px] uppercase"
            >
              {registrationStatusLabels[player.registrationStatus as RegistrationStatus] ??
                player.registrationStatus}
            </Badge>
          )}
        </div>
        {secondaryName && (
          <span className="text-muted-foreground mt-0.5 truncate text-[10px] leading-none">
            {secondaryName}
          </span>
        )}
      </div>

      {/* Disabled reason or checkmark */}
      {isDisabled && disabledReason ? (
        <span className="text-muted-foreground ml-auto shrink-0 text-[10px] font-normal italic">
          {disabledReason}
        </span>
      ) : showCheck ? (
        <Check
          className={cn(
            "ml-auto size-3.5 shrink-0 transition-opacity",
            isSelected ? "text-primary font-bold opacity-100" : "opacity-0"
          )}
        />
      ) : null}
    </CommandItem>
  );
}

/**
 * A highly customizable, compact, and accessible player picker / combobox component.
 * Supports single and multi-selection, preselection by CUID, search,
 * filtering (auto-filters REJECTED by default), sorting, and customizable triggers.
 */
export function PlayerSelect(props: PlayerSelectProps) {
  const {
    players,
    includeRejected = false,
    allowedStatuses,
    excludedStatuses,
    allowedRoles,
    excludedRoles,
    excludedIds = [],
    disabledIds = [],
    disabledItemReason,
    filterFn,
    sortBy = "name",
    sortDirection = "asc",
    sortFn,
    searchPlaceholder = "Rechercher...",
    emptyText = "Aucun joueur trouvé.",
    placeholder = "Sélectionner un joueur...",
    disabled = false,
    clearable = false,
    showStatusBadges = false,
    showSummaryBar = true,
    showClearAll = true,
    align = "start",
    side = "bottom",
    popoverClassName,
    triggerClassName,
    renderTrigger,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    closeOnSelect,
  } = props;

  const isMultiple = props.multiple === true;

  // Uncontrolled open state
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = (nextOpen: boolean) => {
    if (setControlledOpen) {
      setControlledOpen(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
  };

  // Selection state handling (controlled & uncontrolled)
  const [internalSingleValue, setInternalSingleValue] = useState<string | null>(
    props.multiple ? null : (props.defaultValue ?? null)
  );
  const [internalMultiValue, setInternalMultiValue] = useState<string[]>(
    props.multiple ? (props.defaultValue ?? []) : []
  );

  const selectedSingleId = props.multiple
    ? null
    : props.value !== undefined
      ? props.value
      : internalSingleValue;

  const selectedMultiIds = useMemo(() => {
    if (!props.multiple) return [];
    return props.value !== undefined ? props.value : internalMultiValue;
  }, [props.multiple, props.value, internalMultiValue]);

  const selectedIds: string[] = useMemo(() => {
    if (isMultiple) {
      return selectedMultiIds;
    }
    return selectedSingleId ? [selectedSingleId] : [];
  }, [isMultiple, selectedMultiIds, selectedSingleId]);

  // Lookup map for fast player access
  const playersById = useMemo(() => {
    const map = new Map<string, PlayerOption>();
    for (const player of players) {
      map.set(player.id, player);
    }
    return map;
  }, [players]);

  // Selected player objects
  const selectedPlayers = useMemo(() => {
    return selectedIds
      .map((id) => playersById.get(id))
      .filter((p): p is PlayerOption => Boolean(p));
  }, [selectedIds, playersById]);

  // Filtered & Sorted players list
  const visiblePlayers = useMemo(() => {
    const excludedIdSet = new Set(excludedIds);

    const filtered = players.filter((player) => {
      // Excluded ID filter
      if (excludedIdSet.has(player.id)) {
        return false;
      }

      // Default REJECTED status filter
      if (!includeRejected) {
        if (
          player.registrationStatus === RegistrationStatus.REJECTED ||
          player.registrationStatus === "REJECTED"
        ) {
          return false;
        }
      }

      // Allowed statuses whitelist
      if (allowedStatuses && allowedStatuses.length > 0) {
        if (!player.registrationStatus || !allowedStatuses.includes(player.registrationStatus)) {
          return false;
        }
      }

      // Excluded statuses blacklist
      if (excludedStatuses && excludedStatuses.length > 0) {
        if (player.registrationStatus && excludedStatuses.includes(player.registrationStatus)) {
          return false;
        }
      }

      // Allowed roles whitelist
      if (allowedRoles && allowedRoles.length > 0) {
        if (!player.role || !allowedRoles.includes(player.role)) {
          return false;
        }
      }

      // Excluded roles blacklist
      if (excludedRoles && excludedRoles.length > 0) {
        if (player.role && excludedRoles.includes(player.role)) {
          return false;
        }
      }

      // Custom predicate
      if (filterFn && !filterFn(player)) {
        return false;
      }

      return true;
    });

    // Custom comparator if provided
    if (sortFn) {
      return [...filtered].sort(sortFn);
    }

    // Standard sorting
    if (sortBy === "name") {
      return [...filtered].sort((a, b) => {
        const nameA = getPlayerDisplayName(a);
        const nameB = getPlayerDisplayName(b);
        const cmp = nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }

    if (sortBy === "status") {
      return [...filtered].sort((a, b) => {
        const statusA = a.registrationStatus ?? "";
        const statusB = b.registrationStatus ?? "";
        const cmp = statusA.localeCompare(statusB);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }

    if (sortBy === "role") {
      return [...filtered].sort((a, b) => {
        const roleA = a.role ?? "";
        const roleB = b.role ?? "";
        const cmp = roleA.localeCompare(roleB);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }

    return filtered;
  }, [
    players,
    includeRejected,
    allowedStatuses,
    excludedStatuses,
    allowedRoles,
    excludedRoles,
    excludedIds,
    filterFn,
    sortBy,
    sortDirection,
    sortFn,
  ]);

  // Selection handlers
  const handleSelectSingle = (player: PlayerOption) => {
    const isCurrentlySelected = selectedSingleId === player.id;
    const nextId = isCurrentlySelected && clearable ? null : player.id;
    const nextPlayer = nextId ? player : null;

    if (props.multiple === false || props.multiple === undefined) {
      if (props.value === undefined) {
        setInternalSingleValue(nextId);
      }
      props.onChange?.(nextId, nextPlayer);
      props.onValueChange?.(nextId, nextPlayer);
      props.onSelectPlayer?.(player);
    }

    const shouldClose = closeOnSelect ?? true;
    if (shouldClose) {
      setIsOpen(false);
    }
  };

  const handleToggleMulti = (player: PlayerOption) => {
    if (!props.multiple) return;

    const isCurrentlySelected = selectedMultiIds.includes(player.id);
    let nextIds: string[];

    if (isCurrentlySelected) {
      nextIds = selectedMultiIds.filter((id) => id !== player.id);
    } else {
      if (props.maxSelected && selectedMultiIds.length >= props.maxSelected) {
        return;
      }
      nextIds = [...selectedMultiIds, player.id];
    }

    const nextPlayers = nextIds
      .map((id) => playersById.get(id))
      .filter((p): p is PlayerOption => Boolean(p));

    if (props.value === undefined) {
      setInternalMultiValue(nextIds);
    }

    props.onChange?.(nextIds, nextPlayers);
    props.onValueChange?.(nextIds, nextPlayers);
    props.onTogglePlayer?.(player, !isCurrentlySelected);

    const shouldClose = closeOnSelect ?? false;
    if (shouldClose) {
      setIsOpen(false);
    }
  };

  const handleClearAll = React.useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (props.multiple) {
        if (props.value === undefined) {
          setInternalMultiValue([]);
        }
        props.onChange?.([], []);
        props.onValueChange?.([], []);
      } else {
        if (props.value === undefined) {
          setInternalSingleValue(null);
        }
        props.onChange?.(null, null);
        props.onValueChange?.(null, null);
      }
    },
    [props]
  );

  // Disabled reason helper
  const getDisabledReason = (player: PlayerOption): string | undefined => {
    if (typeof disabledItemReason === "function") {
      return disabledItemReason(player);
    }
    return disabledItemReason;
  };

  // Render custom or default trigger
  const triggerElement = useMemo(() => {
    if (renderTrigger) {
      if (typeof renderTrigger === "function") {
        return renderTrigger({
          selectedPlayers,
          selectedIds,
          isOpen,
          clear: handleClearAll,
        });
      }
      return renderTrigger;
    }

    // Default trigger UI (compact)
    if (!isMultiple) {
      const selectedPlayer = selectedPlayers[0];
      const displayName = selectedPlayer ? getPlayerDisplayName(selectedPlayer) : null;

      return (
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-8 w-full justify-between gap-1.5 px-2.5 text-xs font-normal",
            !selectedPlayer && "text-muted-foreground",
            triggerClassName
          )}
        >
          {selectedPlayer ? (
            <div className="flex min-w-0 items-center gap-1.5">
              {selectedPlayer.minecraftUsername ? (
                <SkinHead
                  size="sm"
                  username={selectedPlayer.minecraftUsername}
                  className="size-4.5 rounded-md"
                />
              ) : selectedPlayer.discordAvatarUrl ? (
                <Avatar size="sm" className="size-4.5 rounded-md">
                  <AvatarImage
                    src={selectedPlayer.discordAvatarUrl}
                    alt={displayName ?? "Avatar"}
                  />
                  <AvatarFallback className="rounded-md text-[8px]">
                    {displayName?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User className="text-muted-foreground size-3.5 shrink-0" />
              )}
              <span className="text-foreground truncate text-xs font-medium">{displayName}</span>
            </div>
          ) : (
            <span className="truncate text-xs">{placeholder}</span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {clearable && selectedPlayer && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-foreground rounded-sm p-0.5"
              >
                <X className="size-3" />
              </span>
            )}
            <CaretUpDown className="text-muted-foreground size-3 opacity-60" />
          </div>
        </Button>
      );
    }

    // Multiple selection default trigger (compact)
    const count = selectedPlayers.length;

    return (
      <Button
        variant="outline"
        disabled={disabled}
        className={cn(
          "h-8 w-full justify-between gap-1.5 px-2.5 text-xs font-normal",
          count === 0 && "text-muted-foreground",
          triggerClassName
        )}
      >
        {count === 0 ? (
          <span className="truncate text-xs">{placeholder}</span>
        ) : count === 1 ? (
          <div className="flex min-w-0 items-center gap-1.5">
            {selectedPlayers[0].minecraftUsername ? (
              <SkinHead
                size="sm"
                username={selectedPlayers[0].minecraftUsername}
                className="size-4.5 rounded-md"
              />
            ) : (
              <Users className="text-muted-foreground size-3.5 shrink-0" />
            )}
            <span className="text-foreground truncate text-xs font-medium">
              {getPlayerDisplayName(selectedPlayers[0])}
            </span>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-1">
            <Badge variant="secondary" className="h-4 px-1 py-0 text-[10px] font-medium">
              {count}
            </Badge>
            <span className="text-muted-foreground truncate text-xs">
              {selectedPlayers
                .slice(0, 2)
                .map((p) => getPlayerDisplayName(p))
                .join(", ")}
              {count > 2 ? "..." : ""}
            </span>
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {clearable && count > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClearAll}
              className="text-muted-foreground hover:text-foreground rounded-sm p-0.5"
            >
              <X className="size-3" />
            </span>
          )}
          <CaretUpDown className="text-muted-foreground size-3 opacity-60" />
        </div>
      </Button>
    );
  }, [
    renderTrigger,
    selectedPlayers,
    selectedIds,
    isOpen,
    isMultiple,
    disabled,
    triggerClassName,
    placeholder,
    clearable,
    handleClearAll,
  ]);

  const disabledIdSet = useMemo(() => new Set(disabledIds), [disabledIds]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={triggerElement} />
      <PopoverContent
        align={align}
        side={side}
        className={cn("w-[280px] p-0 text-xs shadow-lg", popoverClassName)}
      >
        <Command className="w-full">
          <CommandInput placeholder={searchPlaceholder} />
          {isMultiple && showSummaryBar && selectedPlayers.length > 0 && (
            <div className="bg-muted/40 text-muted-foreground flex items-center justify-between border-b px-2.5 py-1 text-[10px]">
              <span>
                <strong className="text-foreground font-semibold">{selectedPlayers.length}</strong>{" "}
                {selectedPlayers.length > 1 ? "sélectionnés" : "sélectionné"}
              </span>
              {showClearAll && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-destructive text-[10px] font-medium hover:underline"
                >
                  Tout désélectionner
                </button>
              )}
            </div>
          )}
          <CommandList className="max-h-56 overflow-y-auto p-1">
            <CommandEmpty className="text-muted-foreground py-4 text-center text-xs">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {visiblePlayers.map((player) => {
                const isSelected = selectedIds.includes(player.id);
                const isItemDisabled = disabledIdSet.has(player.id);
                const reason = isItemDisabled ? getDisabledReason(player) : undefined;

                return (
                  <PlayerSelectItem
                    key={player.id}
                    player={player}
                    isSelected={isSelected}
                    isDisabled={isItemDisabled}
                    disabledReason={reason}
                    showStatusBadge={showStatusBadges}
                    showCheck={true}
                    onSelect={() => {
                      if (isItemDisabled) return;
                      if (isMultiple) {
                        handleToggleMulti(player);
                      } else {
                        handleSelectSingle(player);
                      }
                    }}
                  />
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
