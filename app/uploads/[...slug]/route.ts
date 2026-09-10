import { readFile, stat } from "fs/promises";
import path from "path";

const UPLOADS_ROOT = path.resolve(process.cwd(), "public", "uploads");

const MIME_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  if (!slug || slug.length === 0) {
    return new Response("Not Found", { status: 404 });
  }

  // Prevent path traversal
  const safeParts = slug.map((part) => path.basename(part));
  const filePath = path.resolve(UPLOADS_ROOT, ...safeParts);

  if (!filePath.startsWith(UPLOADS_ROOT)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return new Response("Not Found", { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const buffer = await readFile(filePath);

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStat.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      return new Response("Not Found", { status: 404 });
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function HEAD(request: Request, props: { params: Promise<{ slug: string[] }> }) {
  const response = await GET(request, props);
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
