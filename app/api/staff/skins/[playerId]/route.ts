import { getCurrentUser } from "@/lib/dal";
import { staffNavItems } from "@/lib/navigation";
import { prisma } from "@/lib/prisma";
import { fetchMinecraftSkinData } from "@/lib/services/minecraft-skin-service";

export const dynamic = "force-dynamic";

// Seuls les skins hébergés par Mojang sont servis (pas de requête vers une URL arbitraire).
const ALLOWED_SKIN_HOST = "textures.minecraft.net";

// GET /api/staff/skins/:playerId → fichier PNG du skin Minecraft du joueur (téléchargement)
export async function GET(_request: Request, { params }: { params: Promise<{ playerId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Non connecté" }, { status: 401 });
  }
  const atlasItem = staffNavItems.find((item) => item.href === "/staff/atlas");
  if (!atlasItem || !atlasItem.roles.includes(user.role)) {
    return Response.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { playerId } = await params;
  const player = await prisma.user.findUnique({
    where: { id: playerId },
    select: { minecraftUsername: true, minecraftUuid: true, minecraftSkinUrl: true },
  });
  if (!player) {
    return Response.json({ error: "Joueur introuvable" }, { status: 404 });
  }

  // Skin à jour depuis Mojang si possible, sinon celui enregistré par la synchro.
  let skinUrl: string | null = null;
  if (player.minecraftUuid) {
    try {
      skinUrl = (await fetchMinecraftSkinData(player.minecraftUuid)).skinUrl ?? null;
    } catch {
      skinUrl = null;
    }
  }
  skinUrl ??= player.minecraftSkinUrl;
  if (!skinUrl) {
    return Response.json({ error: "Aucun skin pour ce joueur" }, { status: 404 });
  }

  let url: URL;
  try {
    url = new URL(skinUrl);
  } catch {
    return Response.json({ error: "URL de skin invalide" }, { status: 502 });
  }
  if (url.hostname !== ALLOWED_SKIN_HOST) {
    return Response.json({ error: "Source de skin non autorisée" }, { status: 502 });
  }
  url.protocol = "https:";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      return Response.json({ error: "Téléchargement du skin impossible" }, { status: 502 });
    }
    const png = await res.arrayBuffer();
    const baseName = (player.minecraftUsername ?? player.minecraftUuid ?? "skin").replace(
      /[^A-Za-z0-9_-]/g,
      "_"
    );
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${baseName}-skin.png"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[staff/skins]", error);
    return Response.json({ error: "Téléchargement du skin impossible" }, { status: 502 });
  }
}
