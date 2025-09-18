import { Input } from "@/components/ui/input";
import { useDebounce } from "@uidotdev/usehooks";
import SongTable from "@/components/SongTable";
import { useAction } from "convex/react";
import api from "@/cvx";
import { useQuery } from "@tanstack/react-query";
import { log } from "@/lib/utils";
import { useState } from "react";
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQ = useDebounce(query, 250);
  const search = useAction(api.v2.songs.search);


  const { data, isLoading } = useQuery({
    queryKey: ["trackSearchv2", debouncedQ],
    queryFn: async () => {
      if (!debouncedQ) return Promise.resolve([]);
      const res = await search({ query: debouncedQ });
      return log(res);
    },
  });


  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search for a song, artist, or album..."
          defaultValue={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full"
        />
      </div>
      <SongTable isLoading={isLoading} data={data} />
    </div>
  );
}
