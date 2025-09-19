import api from "@/cvx";
import { selectedComment } from "@/components/comment/state";
import { useAtom } from "@xstate/store/react";
import { normal } from "color-blend";
import { RGBA } from "color-blend/dist/types";
import { Id } from "convex/_generated/dataModel";
import { FunctionReturnType } from "convex/server";

import { commentValidator } from "convex/v2/comments";
import { Infer } from "convex/values";
import parse from "parse-css-color";
export type Comment = Infer<typeof commentValidator>;
const rgba = (c: Comment) => {
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
  song: FunctionReturnType<typeof api.v2.library.getSong>;
  focused: Id<"comments_v2"> | null;
}) {
  const selected = useAtom(selectedComment, c => (c ? comments.find((com) => com._id === c) : undefined));
  const selectedColor = selected && {
    ...rgba(selected)!,
    alpha: 1,
  };
  return (
    <div aria-disabled className="z-0" style={{ gridArea: "1/1" }}>
      {[...song.track.lyrics].map((char, i) => {
        if (char == "\n") return char;
        let isOverride = false;
        let color: RGBA;
        if (
          selectedColor &&
          i >= selected.start &&
          i < selected.end
        ) {
          color = selectedColor!;
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
        const rgb = (a: number) => `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: "1ch",
              fontSize: "1.5em",
              height: "1.5em",
              backgroundColor: rgb(1),
              opacity: (isOverride ? 1 : 0.5)*color.a,
              borderBottom: `3px solid ${rgb(1)}`,
              zIndex: -10,
              verticalAlign: "middle",
              cursor: color.a > 0 ? "pointer" : "none",
              userSelect: "none",
              pointerEvents: "none",
              // boxShadow: isOverride ? `0 0 20px 4px ${rgb(0.7)}` : undefined,
            }}
          >&nbsp;</span>
        );
      })}
    </div>
  );
}

// export function MinimalCommentHighlight({
//   comments,
//   song,
// }: {
//   comments: MinimalComment[];
//   song: Song;
// }) {
//   return (
//     <div aria-disabled className="z-0" style={{ gridArea: "1/1" }}>
//       {[...song.plainLyrics].map((char, i) => {
//         if (char == "\n") return char;
//         const color: RGBA = comments
//             .filter((c) => {
//               return i >= c.start && i < c.end;
//             })
//             .map(rgba)
//             .filter((c) => c != null)
//             .reduceRight(normal, {
//               r: 0,
//               g: 0,
//               b: 0,
//               a: 0,
//             });

//         return (
//           <span
//             key={i}
//             style={{
//               display: "inline-block",
//               width: "1ch",
//               height: "1.1em",
//               backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`,
//               zIndex: -10,
//               verticalAlign: "middle",
//             }}
//           ></span>
//         );
//       })}
//     </div>
//   );
// }
