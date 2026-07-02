import { FileTypeFilter, fileTypeFilters } from "../types";

type DocumentToolbarProps = {
  search: string;
  filter: FileTypeFilter;
  totalCount: number;
  visibleCount: number;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: FileTypeFilter) => void;
};

export function DocumentToolbar({
  search,
  filter,
  totalCount,
  visibleCount,
  onSearchChange,
  onFilterChange,
}: DocumentToolbarProps) {
  return (
    <section className="grid gap-4 rounded-md border border-[#d9dde5] bg-white p-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
      <label className="block">
        <span className="text-sm font-semibold text-[#172033]">Search</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by file name"
          className="mt-2 h-11 w-full rounded-md border border-[#c8ced8] bg-white px-3 text-sm outline-none transition placeholder:text-[#8f98a7] focus:border-[#243b53] focus:ring-4 focus:ring-[#d7e2df]"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-[#172033]">
          File type
        </span>
        <select
          value={filter}
          onChange={(event) =>
            onFilterChange(event.target.value as FileTypeFilter)
          }
          className="mt-2 h-11 w-full rounded-md border border-[#c8ced8] bg-white px-3 text-sm outline-none transition focus:border-[#243b53] focus:ring-4 focus:ring-[#d7e2df]"
        >
          {fileTypeFilters.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-md border border-[#e3e7ed] px-4 py-3 text-sm text-[#5d6675]">
        <span className="font-semibold text-[#172033]">{visibleCount}</span> of{" "}
        <span className="font-semibold text-[#172033]">{totalCount}</span>{" "}
        documents
      </div>
    </section>
  );
}
