"use client";

import Link from "next/link";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DocumentTable } from "./components/document-table";
import { DocumentToolbar } from "./components/document-toolbar";
import { EmptyDocuments } from "./components/empty-documents";
import { UploadDropzone } from "./components/upload-dropzone";
import { dataUrlToBlob } from "./document-utils";
import {
  FileTypeFilter,
  getFileCategory,
  isAcceptedFile,
  StoredDocument,
} from "./types";

const storageKey = "auditready:documents";

export default function DocumentsPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] =
    useState<StoredDocument[]>(readStoredDocuments);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FileTypeFilter>("All");
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(documents));
  }, [documents]);

  const visibleDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesSearch = document.name
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesFilter =
        filter === "All" || getFileCategory(document) === filter;

      return matchesSearch && matchesFilter;
    });
  }, [documents, filter, search]);

  function browseFiles() {
    inputRef.current?.click();
  }

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const acceptedFiles = files.filter(isAcceptedFile);
    const rejectedCount = files.length - acceptedFiles.length;

    if (acceptedFiles.length === 0) {
      setMessage(
        rejectedCount > 0
          ? "Those file types are not supported."
          : "Choose at least one document to upload.",
      );
      return;
    }

    try {
      const uploadedDocuments = await Promise.all(
        acceptedFiles.map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          status: "Uploaded" as const,
          dataUrl: await readFileAsDataUrl(file),
        })),
      );

      setDocuments((currentDocuments) => [
        ...uploadedDocuments,
        ...currentDocuments,
      ]);
      setMessage(
        rejectedCount > 0
          ? `${acceptedFiles.length} uploaded. ${rejectedCount} unsupported file skipped.`
          : `${acceptedFiles.length} document${
              acceptedFiles.length === 1 ? "" : "s"
            } uploaded.`,
      );
    } catch {
      setMessage("Upload failed. Try a smaller file or upload fewer files.");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      void uploadFiles(event.target.files);
      event.target.value = "";
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void uploadFiles(event.dataTransfer.files);
  }

  function viewDocument(document: StoredDocument) {
    const blob = dataUrlToBlob(document);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function deleteDocument(id: string) {
    setDocuments((currentDocuments) =>
      currentDocuments.filter((document) => document.id !== id),
    );
    setMessage("Document deleted.");
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-6 py-8 text-[#172033] sm:px-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col justify-between gap-5 border-b border-[#d9dde5] pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#55706d]">
              AuditReady
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[#172033] sm:text-4xl">
              Documents
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#5d6675]">
              Collect and manage the files that support your audit-ready
              package.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="flex h-11 items-center justify-center rounded-md border border-[#c8ced8] px-4 text-sm font-semibold text-[#172033] transition hover:border-[#8f9aaa] hover:bg-white"
            >
              Back to dashboard
            </Link>
            <button
              type="button"
              onClick={browseFiles}
              className="h-11 rounded-md bg-[#243b53] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(36,59,83,0.16)] transition hover:bg-[#1b2f44]"
            >
              Upload
            </button>
          </div>
        </header>

        <UploadDropzone
          inputRef={inputRef}
          isDragging={isDragging}
          onBrowse={browseFiles}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileChange={handleFileChange}
        />

        {message ? (
          <div className="rounded-md border border-[#d7e2df] bg-[#eef4f2] px-4 py-3 text-sm font-medium text-[#345d57]">
            {message}
          </div>
        ) : null}

        <DocumentToolbar
          search={search}
          filter={filter}
          totalCount={documents.length}
          visibleCount={visibleDocuments.length}
          onSearchChange={setSearch}
          onFilterChange={setFilter}
        />

        {visibleDocuments.length > 0 ? (
          <DocumentTable
            documents={visibleDocuments}
            onView={viewDocument}
            onDelete={deleteDocument}
          />
        ) : (
          <EmptyDocuments
            hasDocuments={documents.length > 0}
            onUpload={browseFiles}
          />
        )}
      </section>
    </main>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readStoredDocuments() {
  if (typeof window === "undefined") {
    return [];
  }

  const storedDocuments = window.localStorage.getItem(storageKey);

  if (!storedDocuments) {
    return [];
  }

  try {
    return JSON.parse(storedDocuments) as StoredDocument[];
  } catch {
    window.localStorage.removeItem(storageKey);
    return [];
  }
}
