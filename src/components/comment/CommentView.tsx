import { Trash, X, Pencil, Link } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AutoResizingTextarea from "../AutoResizingTextarea";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { MinimalComment, Song, useSong, type Comment } from "@/hooks";
import { commentsFocus } from "@/components/comment/state";
import { useAtom } from "@xstate/store/react";
import Confirm from "../Confirm";
import { DialogClose } from "@/components/ui/dialog";

export default function CommentView({
  comment,
  setComment,
  deleteComment,
}: {
  comment: Comment;
  setComment: ({ title, content }: { title: string; content: string }) => void;
  deleteComment: () => void;
}) {
  const songLinked = useSong(comment.linked);

  const beginFocus = useCallback(
    () =>
      commentsFocus.set((c) => ({
        ...c,
        focusedElement: comment._id,
      })),
    [comment._id],
  );
  const endFocus = () =>
    commentsFocus.set((c) => ({
      ...c,
      focusedElement: comment._id == c.focusedElement ? null : c.focusedElement,
    }));
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(comment.title);
  const [content, setContent] = useState(comment.content);

  const isDirty =
    title.trim() !== comment.title || content.trim() !== comment.content;

  const handleSave = () => {
    setComment({ title: title.trim(), content: content.trim() });
    setEditMode(false);
    endFocus();
  };

  const handleCancel = () => {
    setTitle(comment.title);
    setContent(comment.content);
    setEditMode(false);
    endFocus();
  };

  const startEdit = useCallback(() => {
    setEditMode(true);
    beginFocus();
  }, [beginFocus]);

  const queuedEdit = useAtom(commentsFocus, (c) => c.queuedEdit);
  useEffect(() => {
    if (queuedEdit === comment._id && !editMode) {
      startEdit();
    } else if (queuedEdit === comment._id) {
      commentsFocus.set((c) => ({
        ...c,
        queuedEdit: null,
      }));
      document.getElementById(`title-${comment._id}`)?.focus();
    }
  }, [queuedEdit, comment, editMode, startEdit]);
  return (
    <div
      className="bg-white rounded-xl border-2 p-3"
      style={{ borderColor: comment.color }}
      onMouseEnter={beginFocus}
      onMouseLeave={endFocus}
    >
      {songLinked && songLinked.data && (
        <span className="flex text-sm">
          <Link className="h-3.5 my-auto mr-2" />
          <span className="my-auto">
            Linked comment from song{" "}
            <a className="underline" href={`/song?id=${songLinked.data.id}`}>
              {songLinked.data.name}
            </a>
          </span>
        </span>
      )}
      <div className="w-full flex">
        {editMode ? (
          <Input
            id={`title-${comment._id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="my-auto !text-lg w-full mx-0 !border-0 placeholder:text-black/20 !p-0 rounded-none"
            placeholder="comment title (optional)"
          />
        ) : (
          <span className="my-auto text-lg font-semibold">
            {comment.title || (
              <span className="text-black/30 italic">No title</span>
            )}
          </span>
        )}
        {comment.linked ? (
          <Button
            variant="destructive"
            className="ml-auto"
            title="Unlink comment"
            onClick={deleteComment}
          >
            <Trash />
          </Button>
        ) : (
          <Confirm
            message="This action permanently deletes this comment, as well as any instances where you've linked this comment to other songs."
            action="Delete this comment"
            onConfirm={deleteComment}
          >
            <Button
              variant="destructive"
              className="ml-auto"
              title="Delete comment"
            >
              <Trash />
            </Button>
          </Confirm>
        )}
      </div>
      <div>
        {editMode ? (
          <AutoResizingTextarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="!text-sm w-full mx-0 !border-0 placeholder:text-black/20 !p-0 !outline-0"
            placeholder="comment goes here"
          />
        ) : (
          <div className="text-sm whitespace-pre-line text-black/80 min-h-[2em]">
            {comment.content || (
              <span className="text-black/30 italic">No content</span>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2 h-10">
        {editMode ? (
          <>
            {isDirty && (
              <Button variant="fancy" onClick={handleSave}>
                Save
              </Button>
            )}
            <Button
              variant="destructive"
              title="Cancel editing"
              className="ml-auto"
              onClick={handleCancel}
            >
              <X />
            </Button>
          </>
        ) : (
          <Button
            variant="fancy"
            className="w-full"
            title="Edit comment"
            onClick={startEdit}
            style={{ alignSelf: "flex-end" }}
          >
            <Pencil />
          </Button>
        )}
      </div>
    </div>
  );
}

export function CommentReadonly({
  comment,
  song,
  closer,
  showSong = false,
}: {
  comment: Comment | MinimalComment;
  song: Song;
  closer?: () => void;
  showSong?: boolean;
}) {
  const songLinked = useSong("linked" in comment ? comment.linked : null);

  return (
    <div
      className="bg-white rounded-xl border-2 p-3"
      style={{ borderColor: comment.color }}
    >
      {showSong &&
        <a className="text-black/70" href={`/song?id=${song.id}`}><span className="text-black">{song.name}</span> by <span className="text-black">{song.artistName}</span> from <span className="text-black">{song.albumName}</span></a>
      }
      <blockquote className="border-l-4 border-gray-300 p-2 bg-gray-100 italic whitespace-pre-line">
        {song.plainLyrics.slice(comment.start, comment.end)}
      </blockquote>

      {songLinked && songLinked.data && (
        <span className="flex text-sm">
          <Link className="h-3.5 my-auto mr-2" />
          <span className="my-auto">
            Linked comment from song{" "}
            <a className="underline" href={`/song?id=${songLinked.data.id}`}>
              {songLinked.data.name}
            </a>
          </span>
        </span>
      )}
      <div className="w-full flex">
        <span className="my-auto text-lg font-semibold">
          {comment.title || (
            <span className="text-black/30 italic">No title</span>
          )}
        </span>
      </div>
      <div>
        <div className="text-sm whitespace-pre-line text-black/80 min-h-[2em]">
          {comment.content || (
            <span className="text-black/30 italic">No content</span>
          )}
        </div>
      </div>
      <div className="flex gap-2 h-10">
        {closer && (
          <DialogClose asChild>
            <Button className="ml-auto" onClick={closer}>
              Link this comment
            </Button>
          </DialogClose>
        )}
      </div>
    </div>
  );
}
