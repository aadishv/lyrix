import { createAtom } from "@xstate/store";
import { Id } from "convex/_generated/dataModel";
import { useQueryState } from "nuqs";

export const selectedComment = createAtom(null as null | Id<"comments_v2">);
