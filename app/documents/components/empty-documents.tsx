type EmptyDocumentsProps = {
  hasDocuments: boolean;
  onUpload: () => void;
};

export function EmptyDocuments({ hasDocuments, onUpload }: EmptyDocumentsProps) {
  return (
    <section className="flex min-h-72 flex-col items-center justify-center rounded-md border border-[#d9dde5] bg-white p-8 text-center">
      <h2 className="text-2xl font-semibold text-[#172033]">
        {hasDocuments ? "No matching documents" : "No documents uploaded yet"}
      </h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-[#5d6675]">
        {hasDocuments
          ? "Adjust your search or file type filter to see more documents."
          : "Upload source files, supporting schedules, contracts, receipts, and other evidence into this workspace."}
      </p>
      {!hasDocuments ? (
        <button
          type="button"
          onClick={onUpload}
          className="mt-7 h-12 rounded-md bg-[#243b53] px-6 text-base font-semibold text-white shadow-[0_8px_20px_rgba(36,59,83,0.18)] transition hover:bg-[#1b2f44]"
        >
          Upload Documents
        </button>
      ) : null}
    </section>
  );
}
