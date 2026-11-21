import { getCurrentUser } from "@/lib/dal";
import { staffLogsItem } from "@/lib/navigation";
import {
  getLogServers,
  isPterodactylConfigured,
  isValidLogFileName,
  listLogFiles,
  readLogFile,
} from "@/lib/services/pterodactyl-logs";

export const dynamic = "force-dynamic";

// GET /api/staff/logs?server=prod            → liste des fichiers de logs
// GET /api/staff/logs?server=prod&file=X.log → contenu (fin du fichier si trop gros)
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

  const params = new URL(request.url).searchParams;
  const file = params.get("file");
  const server = params.get("server") ?? getLogServers()[0]?.key ?? "";
  if (!getLogServers().some((item) => item.key === server)) {
    return Response.json({ error: "Serveur inconnu" }, { status: 400 });
  }

  try {
    if (!file) {
      return Response.json({ files: await listLogFiles(server) });
    }
    if (!isValidLogFileName(file)) {
      return Response.json({ error: "Nom de fichier invalide" }, { status: 400 });
    }
    const { text, truncated } = await readLogFile(server, file);
    return Response.json({ server, file, text, truncated, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[staff/logs]", error);
    return Response.json({ error: "Lecture des logs impossible" }, { status: 502 });
  }
}
