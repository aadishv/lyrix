import { useState, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  RowSelectionState,
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
import { Song } from "@/hooks";
import {
  Bookmark,
  ListMusic,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useMutation } from "convex/react";
import { Link } from "wouter";
import api from "../cvx";
import Confirm from "./Confirm";

type SongTableProps = {
  isLoading: boolean;
  data: (Song & { isSaved?: boolean })[] | undefined;
};

export default function SongTable({ isLoading, data }: SongTableProps) {
  const saveSong = useMutation(api.library.saveSong);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columns: ColumnDef<Song & { isSaved?: boolean }>[] = useMemo(
    () => [
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
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "trackName",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-semibold hover:bg-transparent -ml-4"
            >
              Track Name
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-medium break-words">{row.getValue("trackName")}</div>
        ),
      },
      {
        accessorKey: "artistName",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-semibold hover:bg-transparent -ml-4"
            >
              Artist
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
      },
      {
        accessorKey: "albumName",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-semibold hover:bg-transparent -ml-4"
            >
              Album
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
      },
      {
        accessorKey: "duration",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-semibold hover:bg-transparent -ml-4"
            >
              Duration
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const duration = row.original.duration;
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
                onConfirm={() => void saveSong({ id: song.id })}
                action="Remove song from library"
                message="Removing this song from your library also permanently deletes all associated comments."
                disabled={!song.isSaved}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label={
                    song.isSaved
                      ? "Remove song from library"
                      : "Save song to library"
                  }
                  title={
                    song.isSaved
                      ? "Remove song from library"
                      : "Save song to library"
                  }
                >
                  <Bookmark
                    className="h-4 w-4"
                    fill={song.isSaved ? "#000" : "none"}
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
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [saveSong]
  );

  const table = useReactTable({
    data: data || [],
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
          {
            savedSelected.length > 0 && (
              <Confirm
                onConfirm={handleBulkToggleSave}
                action="Toggle save status for selected songs"
                message={
                  savedSelected.length > 0
                    ? `This will remove the following songs from your library (permanently deleting associated comments): ${savedSelected.map(s => s.trackName).join(', ')}. Other selected songs will be saved.`
                    : "This will toggle the save status for all selected songs."
                }
              >
                <Button disabled={selectedRows.length === 0}>Toggle Save Status</Button>
              </Confirm>
            )
          }
          {
            savedSelected.length === 0 && (
                <Button disabled={selectedRows.length === 0} onClick={handleBulkToggleSave} title="Toggle save status for selected songs">Toggle Save Status</Button>
            )
          }
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
                    case "trackName":
                      widthClass = "max-w-64";
                      break;
                    case "artistName":
                      widthClass = "max-w-48";
                      break;
                    case "albumName":
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
                      className={`border-r border-border/50 last:border-r-0 ${widthClass}`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="bg-gray-100">
            {table.getRowModel().rows?.length ? (
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
                        className={`border-r border-border/50 last:border-r-0 ${widthClass} ${
                          cell.column.id === "trackName" || cell.column.id === "artistName" || cell.column.id === "albumName"
                            ? "break-words hyphens-auto overflow-hidden"
                            : ""
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow
                  key={i}
                >
                  {["select", "trackName", "artistName", "albumName", "duration", "actions"].map((cell) => {
                    let widthClass = "";
                    switch (cell) {
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
                        key={cell}
                        className={`border-r border-border/50 last:border-r-0 ${widthClass}`}
                      >
                        <Skeleton className="h-10 w-full" />
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
