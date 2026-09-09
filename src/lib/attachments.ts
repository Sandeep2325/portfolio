export type AttachmentKind = "image" | "audio" | "file";

export const DM_ATTACHMENT_BUCKET = "dm-attachments";
export const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
/** Signed URLs are re-requested by the client, so they can be short-lived. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Document types worth accepting from a portfolio contact form conversation. */
const FILE_MIME_ALLOWLIST = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/rtf",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
]);

export const FILE_INPUT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.zip,.txt,.csv,.md,.json," + [...FILE_MIME_ALLOWLIST].join(",");

export function kindForMime(mime: string): AttachmentKind | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (FILE_MIME_ALLOWLIST.has(mime)) return "file";
  // Some browsers report an empty type for less common documents; the
  // extension check at the call site decides those.
  return null;
}

const FILE_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "rtf", "zip", "txt", "csv", "md", "json",
]);

export function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
}

/** Resolves a kind from the MIME type, falling back to the file extension. */
export function resolveKind(mime: string, name: string): AttachmentKind | null {
  const byMime = kindForMime(mime || "");
  if (byMime) return byMime;
  return FILE_EXTENSIONS.has(extensionOf(name)) ? "file" : null;
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(ms: number | null | undefined) {
  if (!ms || ms < 0) return "0:00";
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
