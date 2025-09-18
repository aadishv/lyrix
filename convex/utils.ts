import { Track } from "@spotify/web-api-ts-sdk";
import { v, Validator } from "convex/values";

export const trackValidator = v.any() as Validator<Track>;
