import { getCurrentUser } from "@/lib/dal";
import { staffLogsItem } from "@/lib/navigation";
import {
  isPterodactylConfigured,
  isValidLogFileName,
  listLogFiles,
  readLogFile,
} from "@/lib/services/pterodactyl-logs";

export const dynamic = "force-dynamic";

// GET /api/staff/logs            → liste des fichiers de logs
// GET /api/staff/logs?file=X.log → contenu (fin du fichier si trop gros)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Non connecté" }, { status: 401 });
  }
  if (!staffLogsItem.roles.includes(user.role)) {
    return Response.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (!isPterodactylConfigured()) {
    return Response.json({ error: "Pterodactyl non configuré" }, { status: 503 });
  }

  const file = new URL(request.url).searchParams.get("file");

  try {
    if (!file) {
      return Response.json({ files: await listLogFiles() });
    }
    if (!isValidLogFileName(file)) {
      return Response.json({ error: "Nom de fichier invalide" }, { status: 400 });
    }
    const { text, truncated } = await readLogFile(file);
    return Response.json({ file, text, truncated, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[staff/logs]", error);
    return Response.json({ error: "Lecture des logs impossible" }, { status: 502 });
  }
}
