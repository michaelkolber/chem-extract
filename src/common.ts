import { Compound } from "@/types/compound";

/** Maps PubChem CIDs to `Compound`s. */
export type CompoundMap = Map<string, Compound>;

export interface CompoundProps {
  compounds: CompoundMap;
}
