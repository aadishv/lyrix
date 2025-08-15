import { Song, Comment, MinimalComment } from "@/hooks";
import { normal } from "color-blend";
import { RGBA } from "color-blend/dist/types";
import { Id } from "convex/_generated/dataModel";
import parse from "parse-css-color";

const rgba = (c: Comment | MinimalComment) => {
  if (!c) return null;
  const color = parse(c.color);
  return color
    ? {
        r: color.values[0],
        g: color.values[1],
        b: color.values[2],
        a: color.alpha,
      }
    : null;
};

export default function CommentHighlight({
  comments,
  song,
  focused,
}: {
  comments: Comment[];
  song: Song;
  focused: Id<"comments"> | null;
}) {
  const focusedComment = comments.filter((c) => c._id === focused);
  const overrideColor =
    focusedComment.length > 0
      ? {
          ...rgba(focusedComment[0])!,
          alpha: 1,
        }
      : null;
  return (
    <div aria-disabled className="z-0" style={{ gridArea: "1/1" }}>
      {[...song.plainLyrics].map((char, i) => {
        if (char == "\n") return char;
        let isOverride = false;
        let color: RGBA;
        if (
          overrideColor &&
          i >= focusedComment[0].start &&
          i < focusedComment[0].end
        ) {
          color = overrideColor!;
          isOverride = true;
        } else {
          color = comments
            .filter((c) => {
              return i >= c.start && i < c.end;
            })
            .map(rgba)
            .filter((c) => c != null)
            .reduceRight(normal, {
              r: 0,
              g: 0,
              b: 0,
              a: 0,
            });
        }

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: "1ch",
              height: "1.1em",
              backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
              zIndex: -10,
              verticalAlign: "middle",
            }}
            className={isOverride ? "border-b-2 border-border" : ""}
          ></span>
        );
      })}
    </div>
  );
}


export function MinimalCommentHighlight({
  comments,
  song,
}: {
  comments: MinimalComment[];
  song: Song;
}) {
  return (
    <div aria-disabled className="z-0" style={{ gridArea: "1/1" }}>
      {[...song.plainLyrics].map((char, i) => {
        if (char == "\n") return char;
        const color: RGBA = comments
            .filter((c) => {
              return i >= c.start && i < c.end;
            })
            .map(rgba)
            .filter((c) => c != null)
            .reduceRight(normal, {
              r: 0,
              g: 0,
              b: 0,
              a: 0,
            });

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: "1ch",
              height: "1.1em",
              backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
              zIndex: -10,
              verticalAlign: "middle",
            }}
          ></span>
        );
      })}
    </div>
  );
}
