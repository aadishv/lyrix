import { useState, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bookmark,
  ListMusic,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useMutation } from "convex/react";
import { Link } from "wouter";
import api from "../cvx";
import Confirm from "./Confirm";
import { Track } from "@spotify/web-api-ts-sdk";
import { toast } from "sonner";
import { SpotifyLogo } from "./logos";

type SongTableProps = {
  isLoading: boolean;
  data: Track[] | undefined;
};

const dummies = new Array(6).fill(null);

const useColumns = () => {
  const saveSong = useMutation(api.library.saveSong);
  const header =
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
    );
  const columns: ColumnDef<Track>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
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
            <img src={row.original.album.images[0].url} className="h-8" />
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
          // row.original.name
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

          return (
            <div className="flex items-center gap-1 h-8">
              <Confirm
                // void saveSong({ id: song.id })
                onConfirm={() => toast.error("unimplemented")}
                action="Remove song from library"
                message="Removing this song from your library also permanently deletes all associated comments."
                // disabled={!song.isSaved}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  // aria-label={
                  //   // song.isSaved
                  //   false
                  //     ? "Remove song from library"
                  //     : "Save song to library"
                  // }
                  // title={
                  //   // song.isSaved
                  //   false
                  //     ? "Remove song from library"
                  //     : "Save song to library"
                  // }
                >
                  <Bookmark
                    className="h-4 w-4"
                    // fill={/*song.isSaved*/ false ? "#000" : "none"}
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
                asChild
              >
                <Link href={`/song?id=${song.id}`}>
                  <ListMusic className="h-4 w-4" />
                </Link>
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
    ],
    // [saveSong]
    [],
  );
  return { columns, saveSong };
};

export default function SongTable({ isLoading, data }: SongTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { columns, saveSong } = useColumns();
  const adjustedData = isLoading ? dummies : (data ?? []);
  const table = useReactTable({
    data: adjustedData,
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
  const selectedSongs = selectedRows.map((row) => row.original);
  const savedSelected = selectedSongs.filter((song) => song.isSaved);

  const handleBulkToggleSave = () => {
    selectedSongs.forEach((song) => void saveSong({ id: song.id }));
    setRowSelection({});
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        {savedSelected.length > 0 && (
          <Confirm
            onConfirm={handleBulkToggleSave}
            action="Toggle save status for selected songs"
            message={
              savedSelected.length > 0
                ? `This will remove the following songs from your library (permanently deleting associated comments): ${savedSelected.map((s) => s.trackName).join(", ")}. Other selected songs will be saved.`
                : "This will toggle the save status for all selected songs."
            }
          >
            <Button disabled={selectedRows.length === 0}>
              Toggle Save Status
            </Button>
          </Confirm>
        )}
        {savedSelected.length === 0 && (
          <Button
            disabled={selectedRows.length === 0}
            onClick={handleBulkToggleSave}
            title="Toggle save status for selected songs"
          >
            Toggle Save Status
          </Button>
        )}
        <span className="text-foreground/70 text-sm ml-auto">Search results provided by Spotify</span>
      </div>
      <div className="rounded-lg overflow-hidden">
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
            {adjustedData?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => {
                    let widthClass = "";
                    switch (cell.column.id) {
                      case "trackName":
                        widthClass = "max-w-64";
                        break;
                      case "artistName":
                        widthClass = "max-w-48";
                        break;
                      case "albumName":
                        widthClass = "max-w-48";
                        break;
                    }
                    return (
                      <TableCell
                        key={cell.id}
                        className={`border-r border-border/50  last:border-r-0 ${widthClass} ${
                          cell.column.id === "trackName" ||
                          cell.column.id === "artistName" ||
                          cell.column.id === "albumName"
                            ? "break-words hyphens-auto overflow-hidden"
                            : ""
                        }`}
                      >
                        {!isLoading ? (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )
                        ) : (
                          <Skeleton className="h-6 w-full" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results found. Try a different search query.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
