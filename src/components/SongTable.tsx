import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  RowSelectionState,
  Column,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Bookmark,
  ListMusic,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import api from "../cvx";
import Confirm from "./Confirm";
import { Track } from "@spotify/web-api-ts-sdk";
import { toast } from "sonner";
import { SpotifyLogo } from "./logos";


type SongTableProps = {
  isLoading: boolean;
  data: Track[] | undefined;
};

export default function SongTable({ isLoading, data }: SongTableProps) {
  const library = useQuery(api.v2.library.getLibrary, {
    filterForComments: false,
  });
  const libraryUris = useMemo(
    () => new Set(library?.map((s) => s.track.uri) ?? []),
    [library],
  );
  const saveSong = useMutation(api.v2.library.saveTrack);

  const header = useCallback(
    (name: string) =>
      ({ column }: { column: Column<Track, unknown> }) => (
        <Button
          variant="ultraghost"
          onClick={() => {
            if (column.getIsSorted() === "asc") {
              column.toggleSorting(true);
            } else if (column.getIsSorted() === false) {
              column.toggleSorting(false);
            } else {
              // desc
              column.clearSorting();
            }
          }}
          className="h-auto font-semibold hover:bg-transparent"
        >
          {name}
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
    [],
  );

  const openAction = useAction(api.v2.songs.getOrCreateTrack);
  const getId = useCallback(
    async (track: Track) => {
      const id = await openAction({ track });
      if (id.type === "error") {
        toast.error(`Failed to fetch lyrics: ${id.message}`);
        throw new Error(`Failed to fetch lyrics: ${id.message}`);
      } else {
        return id.id;
      }
    },
    [openAction],
  );
  const open = useCallback(
    (track: Track) => {
      void getId(track).then((id) => {
        toast.success("Lyrics fetched successfully! Redirecting now...");
        window.open(`/song_v2?id=${id}`, "_blank")?.focus();
      });
    },
    [getId],
  );
  const columns = useMemo<ColumnDef<Track>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="mx-auto"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: header("Song"),
    },
    {
      accessorKey: "artistName",
      header: header("Artist"),
      cell: ({ row }) => (
        <div className="flex gap-2">
          <span className="my-auto w-full break-words hyphens-auto overflow-hidden">
            {row.original.artists.map((a) => a.name).join(", ")}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "album.name",
      header: header("Album"),
      cell: ({ row }) => (
        <div className="flex gap-2">
          <img src={row.original.album.images[0].url} className="h-8" loading="lazy" decoding="async" />
          <span className="my-auto w-full break-words hyphens-auto overflow-hidden">
            {row.original.album.name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "duration",
      header: header("Duration"),
      cell: ({ row }) => {
        const duration = row.original.duration_ms / 1000;
        return duration
          ? `${Math.floor(duration / 60)}:${(duration % 60)
              .toFixed(0)
              .toString()
              .padStart(2, "0")}`
          : "--";
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const song = row.original;
        const isSaved = libraryUris.has(song.uri);
        return (
          <div className="flex items-center gap-1 h-8">
            <Confirm
              onConfirm={() => {
                void getId(song).then((track) => {
                  saveSong({ track })
                    .then(() =>
                      toast.success(
                        isSaved
                          ? "Song removed from library"
                          : "Song saved to library",
                      ),
                    )
                    .catch((e) =>
                      toast.error(
                        `Failed to save song to library: ${e.message}`,
                      ),
                    );
                });
              }}
              action="Remove song from library"
              message="Removing this song from your library also permanently deletes all associated comments."
              disabled={!isSaved}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label={isSaved ? "Remove song from library" : "Save song to library"}
                title={isSaved ? "Remove song from library" : "Save song to library"}
              >
                <Bookmark
                  className="h-4 w-4"
                  fill={isSaved ? "#000" : "none"}
                  stroke="#000"
                />
              </Button>
            </Confirm>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Open song lyrics"
              title="Open song lyrics"
              onClick={() => void open(row.original)}
            >
              <ListMusic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Open in Spotify"
              title="Open in Spotify"
              asChild
            >
              <a href={song.external_urls.spotify} target="_blank">
                <SpotifyLogo className="h-4 w-4" />
              </a>
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
    // ↓ eslint thinks we don't need selectedRows but otherwise the checkboxes
    // don't trigger rerenders
    // [removed for now]
  ], [header, libraryUris, getId, saveSong, open]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [prevData, setPrevData] = useState<Track[]>([]);
  useEffect(() => {
    if (data && data.length) setPrevData(data);
  }, [data]);
  const tableData: Track[] = isLoading ? prevData : (data ?? prevData);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
  });
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedSongs = useMemo(() => selectedRows.map((row) => row.original), [selectedRows]);
  const savedSelected = useMemo(
    () => selectedSongs.filter((song) => libraryUris.has(song.uri)),
    [selectedSongs, libraryUris],
  );

  const handleBulkToggleSave = async () => {
    const CONCURRENCY = 8;
    const queue = [...selectedSongs];
    let hadError = false;

    const worker = async () => {
      while (queue.length) {
        const song = queue.shift()!;
        try {
          const track = await getId(song);
          await saveSong({ track });
        } catch (e: any) {
          hadError = true;
          toast.error(`Failed to save song to library: ${e?.message ?? e}`);
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, Math.max(1, queue.length)) },
      () => worker(),
    );
    await Promise.all(workers);

    if (!hadError) {
      toast.success("Toggled save status for selected songs");
    }
    setRowSelection({});
  };

  // Virtualization setup
  const rows = table.getRowModel().rows;
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - virtualRows[virtualRows.length - 1].end
      : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        {savedSelected.length > 0 && (
          <Confirm
            onConfirm={() => void handleBulkToggleSave()}
            action="Toggle save status for selected songs"
            message={
              savedSelected.length > 0
                ? `This will remove the following songs from your library (permanently deleting associated comments): ${savedSelected.map((s) => s.name).join(", ")}. Other selected songs will be saved.`
                : "This will toggle the save status for all selected songs."
            }
          >
            <Button disabled={selectedRows.length === 0}>
              Bulk toggle save
            </Button>
          </Confirm>
        )}
        {savedSelected.length === 0 && (
          <Button
            disabled={selectedRows.length === 0}
            onClick={() => void handleBulkToggleSave()}
            title="Toggle save status for selected songs"
          >
            Toggle Save Status
          </Button>
        )}
        <span className="text-foreground/70 text-sm ml-auto">
          Search results provided by Spotify
        </span>
      </div>
      <div className="rounded-lg overflow-auto max-h-[70vh]" ref={parentRef}>
        <Table>
          <TableHeader className="bg-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  let widthClass = "";
                  switch (header.id) {
                    case "select":
                      widthClass = "w-12";
                      break;
                    case "name":
                      widthClass = "max-w-64";
                      break;
                    case "artistName":
                      widthClass = "max-w-48";
                      break;
                    case "album.name":
                      widthClass = "max-w-48";
                      break;
                    case "duration":
                      widthClass = "w-20";
                      break;
                    case "actions":
                      widthClass = "w-20";
                      break;
                  }
                  return (
                    <TableHead
                      key={header.id}
                      className={`border-r border-border/50 last:border-r-0 ${widthClass} break-words hyphens-auto overflow-hidden`}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="bg-gray-100">
            {rows.length ? (
              <>
                {paddingTop > 0 && (
                  <TableRow>
                    <TableCell
                      style={{ height: paddingTop }}
                      colSpan={columns.length}
                    />
                  </TableRow>
                )}
                {virtualRows.map((vRow) => {
                  const row = rows[vRow.index];
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => {
                        let widthClass = "";
                        switch (cell.column.id) {
                          case "name":
                            widthClass = "max-w-64";
                            break;
                          case "artistName":
                            widthClass = "max-w-48";
                            break;
                          case "album.name":
                            widthClass = "max-w-48";
                            break;
                        }
                        return (
                          <TableCell
                            key={cell.id}
                            className={`border-r border-border/50  last:border-r-0 ${widthClass} ${
                              cell.column.id === "name" ||
                              cell.column.id === "artistName" ||
                              cell.column.id === "album.name"
                                ? "break-words hyphens-auto overflow-hidden"
                                : ""
                            }`}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
                {paddingBottom > 0 && (
                  <TableRow>
                    <TableCell
                      style={{ height: paddingBottom }}
                      colSpan={columns.length}
                    />
                  </TableRow>
                )}
              </>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {isLoading
                    ? "Loading..."
                    : "No results found. Try a different search query."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
