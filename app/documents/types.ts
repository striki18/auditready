export type DocumentStatus = "Uploaded";

export type StoredDocument = {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  status: DocumentStatus;
  dataUrl: string;
};

export const acceptedFileTypes = [
  ".pdf",
  ".xlsx",
  ".xls",
  ".csv",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
];

export const fileTypeFilters = [
  "All",
  "PDF",
  "Excel",
  "CSV",
  "Word",
  "Image",
] as const;

export type FileTypeFilter = (typeof fileTypeFilters)[number];

export function getFileCategory(file: Pick<StoredDocument, "name" | "type">) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (file.type === "application/pdf" || extension === "pdf") {
    return "PDF";
  }

  if (["xlsx", "xls"].includes(extension)) {
    return "Excel";
  }

  if (file.type === "text/csv" || extension === "csv") {
    return "CSV";
  }

  if (extension === "docx") {
    return "Word";
  }

  if (
    file.type.startsWith("image/") ||
    ["png", "jpg", "jpeg"].includes(extension)
  ) {
    return "Image";
  }

  return "Other";
}

export function isAcceptedFile(file: File) {
  const category = getFileCategory({ name: file.name, type: file.type });
  return category !== "Other";
}
