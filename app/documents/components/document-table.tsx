import { formatBytes, formatUploadDate } from "../document-utils";
import { getFileCategory, StoredDocument } from "../types";

type DocumentTableProps = {
  documents: StoredDocument[];
  onView: (document: StoredDocument) => void;
  onDelete: (id: string) => void;
};

export function DocumentTable({
  documents,
  onView,
  onDelete,
}: DocumentTableProps) {
  return (
    <section className="overflow-hidden rounded-md border border-[#d9dde5] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-[#f0f3f6] text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6675]">
            <tr>
              <th className="px-4 py-3">File Name</th>
              <th className="px-4 py-3">File Type</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Upload Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr
                key={document.id}
                className="border-t border-[#e3e7ed] text-[#263349]"
              >
                <td className="max-w-[280px] px-4 py-4">
                  <span className="block truncate font-semibold">
                    {document.name}
                  </span>
                </td>
                <td className="px-4 py-4">{getFileCategory(document)}</td>
                <td className="px-4 py-4">{formatBytes(document.size)}</td>
                <td className="px-4 py-4">
                  {formatUploadDate(document.uploadedAt)}
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-[#eef4f2] px-3 py-1 text-xs font-semibold text-[#345d57]">
                    {document.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onView(document)}
                      className="h-9 rounded-md border border-[#c8ced8] px-3 font-semibold text-[#172033] transition hover:border-[#8f9aaa] hover:bg-[#f6f7f9]"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(document.id)}
                      className="h-9 rounded-md border border-[#e1b8b8] px-3 font-semibold text-[#8a2d2d] transition hover:border-[#ba7474] hover:bg-[#fff5f5]"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
