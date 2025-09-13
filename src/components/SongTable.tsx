import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Song } from "@/hooks";
import { Bookmark, ListMusic, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { Link } from "wouter";
import api from "../cvx";
import Confirm from "./Confirm";
import { useState, useCallback, useMemo } from "react";
type SongTable = {
  isLoading: boolean;
  data: (Song & { isSaved?: boolean })[] | undefined;
};
export default function SongTable({ isLoading, data }: SongTable) {
  const saveSong = useMutation(api.library.saveSong);
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const savedSelected = useMemo(() => {
    if (!data) return [];
    return data.filter(song => selectedSongs.includes(song.id.toString()) && song.isSaved);
  }, [data, selectedSongs]);

  const handleSelect = useCallback((songId: string, index: number, shiftKey: boolean) => {
    if (shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = data?.slice(start, end + 1).map((song: Song & { isSaved?: boolean }) => song.id.toString()) || [];
      setSelectedSongs(prev => {
        const newSelected = new Set<string>(prev);
        rangeIds.forEach(id => newSelected.add(id));
        return Array.from(newSelected);
      });
      setLastSelectedIndex(index);
    } else {
      setSelectedSongs(prev =>
        prev.includes(songId)
          ? prev.filter(id => id !== songId)
          : [...prev, songId]
      );
      setLastSelectedIndex(index);
    }
  }, [data, lastSelectedIndex]);

  const handleSelectAll = useCallback(() => {
    if (data) {
      setSelectedSongs(data.map(song => song.id.toString()));
    }
  }, [data]);

  const handleDeselectAll = useCallback(() => {
    setSelectedSongs([]);
    setLastSelectedIndex(null);
  }, []);

  const handleBulkOpen = useCallback(() => {
    selectedSongs.forEach(songId => {
      window.open(`/song?id=${songId}`, '_blank');
    });
  }, [selectedSongs]);

  const handleBulkToggleSave = useCallback(() => {
    selectedSongs.forEach(songId => void saveSong({ id: parseInt(songId) }));
    setSelectedSongs([]);
  }, [selectedSongs, saveSong]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 mb-4 items-center">
        <Button onClick={handleSelectAll} disabled={!data || data.length === 0 || selectedSongs.length === data.length}>
          <CheckSquare className="mr-2 h-4 w-4" />
          Select All
        </Button>
        <Button onClick={handleDeselectAll} disabled={selectedSongs.length === 0}>
          <Square className="mr-2 h-4 w-4" />
          Deselect All
        </Button>
        {selectedSongs.length > 0 && (
          <>
            <span className="text-sm text-muted-foreground">Selected: {selectedSongs.length}</span>
            <Button onClick={handleBulkOpen}>
              Open Selected in New Tabs
            </Button>
            <Confirm
              onConfirm={handleBulkToggleSave}
              action="Toggle save status for selected songs"
              message={
                savedSelected.length > 0
                  ? `This will remove the following songs from your library (permanently deleting associated comments): ${savedSelected.map(s => s.trackName).join(', ')}. Other selected songs will be saved.`
                  : "This will toggle the save status for all selected songs."
              }
            >
              <Button>
                Toggle Save Status
              </Button>
            </Confirm>
          </>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[5%]">
              <input
                type="checkbox"
                checked={data ? selectedSongs.length === data.length && data.length > 0 : false}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleSelectAll();
                  } else {
                    handleDeselectAll();
                  }
                }}
                className="h-4 w-4"
              />
            </TableHead>
            <TableHead className="w-1/3">Track Name</TableHead>
            <TableHead className="w-1/4">Artist</TableHead>
            <TableHead className="w-1/4">Album</TableHead>
            <TableHead className="w-[12%]">Duration</TableHead>
            <TableHead className="w-[5%]">&nbsp;</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                </TableRow>
              ))
            : data && data.length > 0
              ? data.map((song, index) => (
                    <TableRow key={song.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedSongs.includes(song.id.toString())}
                          onClick={(e) => {
                            if (e.shiftKey && lastSelectedIndex !== null) {
                              e.preventDefault();
                              handleSelect(song.id.toString(), index, true);
                            }
                          }}
                          onChange={() => {
                            handleSelect(song.id.toString(), index, false);
                          }}
                          className="h-4 w-4"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {song.trackName}
                      </TableCell>
                      <TableCell>{song.artistName}</TableCell>
                      <TableCell>{song.albumName}</TableCell>
                      <TableCell>
                        {song.duration
                          ? `${Math.floor(song.duration / 60)}:${(
                              song.duration % 60
                            )
                              .toFixed(0)
                              .toString()
                              .padStart(2, "0")}`
                          : "--"}
                      </TableCell>
                      {song.isSaved != undefined && (
                        <TableCell>
                          <Confirm
                            onConfirm={() => void saveSong({ id: song.id })}
                            action="Remove song from library"
                            message="Removing this song from your library also permanently deletes all associated comments."
                            disabled={!song.isSaved}
                          >
                            <Button
                              variant="ghost"
                              className="-py-2 -my-2"
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
                                className=""
                                fill={song.isSaved ? "#000" : "none"}
                                stroke="#000"
                              />
                            </Button>
                          </Confirm>
                          <Button
                            variant="ghost"
                            className="-py-2 -my-2"
                            aria-label={"Open song lyrics"}
                            title={"Open song lyrics"}
                            asChild
                          >
                            <Link href={`/song?id=${song.id}`}>
                              <ListMusic />
                            </Link>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
              : !isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No results found. Try a different search query.
                    </TableCell>
                  </TableRow>
                )}
        </TableBody>
      </Table>
    </div>
  );
}
