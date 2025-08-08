import { useLibrary } from "@/hooks";
import SongTable from "@/components/SongTable";
import { LibraryBig } from "lucide-react";
import { useMemo } from "react";
import { Input } from "@/components/ui/input";

import { useQueryState } from "nuqs";
import Fuse from "fuse.js";

export default function LibraryPage() {
  const { data, isLoading } = useLibrary();
  const [query, setQuery] = useQueryState<string>("query", {
    defaultValue: "",
    parse: (v) => v,
  });

  const fuse = useMemo(() => {
    if (!data) return null;
    const options = {
      keys: [
        { name: "trackName", weight: 0.4 },
        { name: "artistName", weight: 0.3 },
        { name: "albumName", weight: 0.2 },
      ],
      threshold: 0.3,
      includeScore: true,
    };

    return new Fuse(data, options);
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data || !query.trim()) return data;
    if (!fuse) return data;

    const results = fuse.search(query);
    return results.map((result) => result.item);
  }, [data, query, fuse]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row font-serif gap-2">
        <LibraryBig />
        <h1>Library</h1>
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search your library..."
          value={query}
          onChange={(e) => void setQuery(e.target.value)}
          className="w-full"
        />
      </div>
      <SongTable isLoading={isLoading} data={filteredData} />
    </div>
  );
}
