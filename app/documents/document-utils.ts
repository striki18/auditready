import { StoredDocument } from "./types";

export function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatUploadDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function dataUrlToBlob(document: StoredDocument) {
  const [header, base64] = document.dataUrl.split(",");
  const contentType =
    header.match(/data:(.*);base64/)?.[1] || "application/octet-stream";
  const byteCharacters = atob(base64);
  const byteNumbers = Array.from(byteCharacters, (character) =>
    character.charCodeAt(0),
  );

  return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
}
