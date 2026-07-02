import { ChangeEvent, DragEvent, RefObject } from "react";
import { acceptedFileTypes } from "../types";

type UploadDropzoneProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  onBrowse: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function UploadDropzone({
  inputRef,
  isDragging,
  onBrowse,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
}: UploadDropzoneProps) {
  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-md border border-dashed p-6 transition sm:p-8 ${
        isDragging
          ? "border-[#243b53] bg-[#eef4f2]"
          : "border-[#bfc7d3] bg-white"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptedFileTypes.join(",")}
        onChange={onFileChange}
        className="sr-only"
      />
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-[#172033]">
            Drag and drop files here
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5d6675]">
            Upload PDFs, Excel workbooks, CSV files, Word documents, and images.
            Multiple files are supported.
          </p>
        </div>
        <button
          type="button"
          onClick={onBrowse}
          className="h-11 rounded-md bg-[#243b53] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(36,59,83,0.16)] transition hover:bg-[#1b2f44]"
        >
          Upload Documents
        </button>
      </div>
    </section>
  );
}
