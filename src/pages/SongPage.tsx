import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/cvx";
import {
  Song,
  useCommentsForSong,
  useElementSelection,
  useSong,
} from "@/hooks";
import { useMutation, useQuery } from "convex/react";
import { Redirect } from "wouter";
import CommentView, { CommentReadonly } from "@/components/comment/CommentView";
import CommentHighlight, { MinimalCommentHighlight } from "@/components/comment/CommentHighlight";
import { useAtom } from "@xstate/store/react";
import {
  DialogHeader,
  DialogFooter,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { CommentChooser } from "@/components/comment/CommentChooser";
import {
  commentsFocus,
  selectionAtom,
  useCurrentSong,
} from "@/components/comment/state";
import Confirm from "@/components/Confirm";
import { Link, Plus, Save, Share2, Trash } from "lucide-react";
import { ShareLinkComponent } from "@/components/ShareLink";
import { Suspense, useEffect, useState } from "react";
import { useQueryState } from "nuqs";

function SongDetails({ song }: { song: Song }) {
  /* info card */
  return (
    <div className="p-4">
      <div className="text-xl font-bold mb-1">
        {song.trackName || song.name}
      </div>
      <div className="text-sm text-muted-foreground mb-2">
        <span>
          Artist: <span className="font-medium">{song.artistName}</span>
        </span>
        <span className="mx-2">|</span>
        <span>
          Album: <span className="font-medium">{song.albumName}</span>
        </span>
      </div>
      <div className="text-xs">
        Duration:{" "}
        {typeof song.duration === "number"
          ? `${Math.floor(song.duration / 60).toFixed(0)}:${(song.duration % 60).toFixed(0).padStart(2, "0")}`
          : "?"}{" "}
        min
        <span className="mx-2">|</span>
        {song.instrumental ? "instrumental" : "with lyrics ↓"}
        {song.isSaved ? (
          <Badge className="ml-2" variant="default">
            Saved
          </Badge>
        ) : (
          <Badge className="ml-2" variant="outline">
            Not saved
          </Badge>
        )}
      </div>
    </div>
  );
}

function ShareSong({ id }: { id: number }) {
  const runShare = useMutation(api.share.shareSong);
  const [link, setLink] = useState(null as string | null);
  const [isLive, setIsLive] = useState(false);
  useEffect(() => {
    void runShare({
      live: isLive,
      songId: id
    }).then(res => setLink(res));
  }, [id, runShare, isLive]);
  console.log(isLive);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Share comments</DialogTitle>
      </DialogHeader>
      <div>
        <div>
          <input
            type="radio"
            id="share-snapshot"
            name="share-type"
            value="default"
            checked={!isLive}
            onChange={() => setIsLive(false)}
            className="mr-2"
          />
          <label htmlFor="share-snapshot">
            <b>Share snapshot.</b> It is a snapshot, so changes you make after this will not be mirrored.
          </label>
        </div>
        <div>
          <input
            type="radio"
            id="share-live"
            name="share-type"
            value="live"
            checked={isLive}
            onChange={() => setIsLive(true)}
            className="mr-2"
          />
          <label htmlFor="share-live">
            <b>Share live copy.</b> Will update with any and all changes you make to your comments on this song. <em>Cannot be undone.</em>
          </label>
        </div>
      </div>
      <Suspense fallback={<Skeleton className="w-full h-10" />}>
        <ShareLinkComponent
          link={`${window.location.origin.toString()}/song?id=${id}&shared=${link}`}
        />
      </Suspense>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="destructive">Cancel</Button>
        </DialogClose>
      </DialogFooter>
    </>
  );
}

function SongPageInternal({ id }: { id: number }) {
  const { isLoading, data } = useSong(id);
  const saveSong = useMutation(api.library.saveSong);

  const { data: comments } = useCommentsForSong(id);
  const updateComment = useMutation(api.comments.updateComment);
  const deleteComment = useMutation(api.comments.deleteComment);
  const unlink = useMutation(api.comments.unlinkCommentFromSong);
  const newComment = useMutation(api.comments.newComment);

  useElementSelection({
    id: "song-lyrics",
    setter: (v) => {
      selectionAtom.set((old) => {
        if (v == null) {
          return { ...old, selection: v };
        } else {
          return { lastSelection: v, selection: v };
        }
      });
    },
  });

  const focusedComment = useAtom(commentsFocus, (c) => c.focusedElement);
  const selection = useAtom(selectionAtom, (c) => c.selection);

  const handleNewComment = () => {
    window.getSelection()?.removeAllRanges();
    void (async () => {
      const id = await newComment({
        song: data!.id,
        start: selection?.startOffset || 0,
        end: selection?.endOffset || 0,
      });
      commentsFocus.set((c) => ({
        ...c,
        queuedEdit: id,
      }));
    })();
  };

  return (
    <div className="fixed inset-0 flex flex-col w-full overflow-hidden pt-16 lg:px-16 px-4">
      {isLoading ? (
        <Skeleton className="h-40 w-full top-15" />
      ) : data ? (
        <div className="flex flex-col">
          {/* card */}
          <div className="flex-shrink-0 z-10 flex flex-row rounded-lg border shadow bg-white relative">
            <SongDetails song={data} />
            {/* button group */}
            <div className="ml-auto gap-[3px] flex m-1">
              {data.isSaved ? (
                <>
                  <Button
                    disabled={selection == null}
                    onClick={handleNewComment}
                    title={
                      selection == null
                        ? "Select lyrics to begin commenting"
                        : "Comment on selection"
                    }
                    className="rounded rounded-l-xl"
                  >
                    <Plus />
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        disabled={selection == null}
                        title={
                          selection == null
                            ? "Select lyrics to begin commenting"
                            : "Link comment to this song"
                        }
                        className="rounded"
                      >
                        <Link />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Choose comment to link</DialogTitle>
                      </DialogHeader>
                      <CommentChooser />
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="destructive">Cancel</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button title="Share your comments" className="rounded">
                        <Share2 />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <ShareSong id={data.id} />
                    </DialogContent>
                  </Dialog>
                  <Confirm
                    message="Removing this song from your library will permanently delete any comments on it."
                    action="Unsave this song"
                    onConfirm={() => {
                      if (data.id) {
                        void saveSong({ id: data.id });
                      }
                    }}
                  >
                    <Button
                      variant="destructive"
                      title="Unsave"
                      className="rounded-l"
                    >
                      <Trash />
                    </Button>
                  </Confirm>
                </>
              ) : (
                <Button
                  className=""
                  variant="fancy"
                  onClick={() => {
                    if (data.id) {
                      void saveSong({ id: data.id });
                    }
                  }}
                >
                  <Save />
                </Button>
              )}
            </div>
          </div>
          <div
            className="flex relative"
            style={{ height: "calc(100vh - 192px)" }}
          >
            {/* lyrics */}
            <div className="w-[66%] relative">
              <div className="absolute inset-4 overflow-y-auto">
                <div className="text-sm whitespace-pre-wrap font-mono grid grid-cols-1 grid-rows-1">
                  {comments && data?.isSaved && (
                    <CommentHighlight
                      comments={comments}
                      song={data}
                      focused={focusedComment}
                    />
                  )}
                  <div
                    id="song-lyrics"
                    style={{
                      letterSpacing: 0,
                      fontSize: "1em",
                      gridArea: "1/1",
                      zIndex: 1,
                    }}
                  >
                    {data.plainLyrics || "No lyrics found."}
                  </div>
                </div>
              </div>
            </div>
            {/* comments */}
            <div className="w-[33%] relative">
              <div className="absolute inset-0 overflow-y-auto flex flex-col gap-4 p-4">
                {comments &&
                  comments.map((comment) => (
                    <CommentView
                      key={comment._id}
                      comment={comment}
                      setComment={(c) =>
                        void updateComment({
                          ...c,
                          commentId: comment._id,
                        })
                      }
                      deleteComment={() => {
                        if (!comment.linked) {
                          void deleteComment({ commentId: comment._id });
                        } else {
                          void unlink({
                            commentId: comment._id,
                            songId: data.id,
                          });
                        }
                      }}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-destructive">Song not found.</div>
      )}
    </div>
  );
}

function SharedSongPage({ id, link, close }: { id: number, link: string, close: () => void }) {
  const { isLoading, data } = useSong(id);

  const comments = useQuery(api.share.getSharedComments, {
    songId: id,
    link: link,
  }) ?? [];

  return (
    <div className="fixed inset-0 flex flex-col w-full overflow-hidden pt-16 lg:px-16 px-4">
      {isLoading ? (
        <Skeleton className="h-40 w-full top-15" />
      ) : data ? (
        <div className="flex flex-col">
          {/* card */}
          <div className="flex-shrink-0 z-10 flex flex-row rounded-lg border shadow bg-white relative">
            <SongDetails song={data} />
            <span className="bg-secondary my-2 rounded-xl pl-3 mb-auto">This is a shared snapshot of someone's comments on this song. <Button variant="ghost" onClick={close}>View original song</Button></span>
          </div>
          <div
            className="flex relative"
            style={{ height: "calc(100vh - 192px)" }}
          >
            {/* lyrics */}
            <div className="w-[66%] relative">
              <div className="absolute inset-4 overflow-y-auto">
                <div className="text-sm whitespace-pre-wrap font-mono grid grid-cols-1 grid-rows-1">
                  {comments && data?.isSaved && (
                    <MinimalCommentHighlight
                      comments={comments}
                      song={data}
                    />
                  )}
                  <div
                    id="song-lyrics"
                    style={{
                      letterSpacing: 0,
                      fontSize: "1em",
                      gridArea: "1/1",
                      zIndex: 1,
                    }}
                  >
                    {data.plainLyrics || "No lyrics found."}
                  </div>
                </div>
              </div>
            </div>
            {/* comments */}
            <div className="w-[33%] relative">
              <div className="absolute inset-0 overflow-y-auto flex flex-col gap-4 p-4">
                {comments &&
                  comments.map((comment) => (
                    <CommentReadonly key={JSON.stringify(comment)} comment={comment} song={data} />
                  ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-destructive">Song not found.</div>
      )}
    </div>
  );
}


export default function SongPage() {
  const [id] = useCurrentSong();
  const [shared, setShared] = useQueryState<string | null>("shared", {
    defaultValue: null,
    parse: v => v,
  });

  if (!id) {
    return <Redirect to="/404" />;
  }
  return shared ? <SharedSongPage id={id} link={shared} close={() => void setShared(null)} /> : <SongPageInternal id={id} />;
}
