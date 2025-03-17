import { KnownProviders } from '@/types/provider';

export enum Unit {
  Unknown = 'UNKNOWN',
  Celsius = 'C',
  Fahrenheit = 'F',
  GramsPerCubicCentimeter = 'g/cu cm',
}

export type NumericProperty = {
  value: string;
  unit: Unit;
  /** The original string from which this property was parsed. */
  original?: string;
  source: KnownProviders | string;
  /** Link to the source, ideally as close to it on the page as possible. */
  sourceLink: string;
};

export type Hazard = {
  /** The H-code. */
  code: string;
  hazardStatement: string;
  /** The pictogram code, e.g. `GHS02`. */
  pictogram: string;
};

/** Property object as used by a Compound. */
export interface Properties {
  meltingPoint: NumericProperty[];
  boilingPoint: NumericProperty[];
  density: NumericProperty[];
  hazards: Hazard[];
}

export function compareProperties(a: NumericProperty, b: NumericProperty): number {
  // If they have different units, sort by C, then F, then Unknown (ignore g/cu cm).
  if (a.unit !== b.unit) {
    // Uknown is always the worst
    if (a.unit === Unit.Unknown) return 1;
    if (b.unit === Unit.Unknown) return -1;
    // This should never happen, since it means that we have a mix of density units and temperature
    // units.
    if (a.unit === Unit.GramsPerCubicCentimeter || b.unit === Unit.GramsPerCubicCentimeter) {
      console.error(
        `A mix of density units and temperature units was found when comparing the following objects:\n${JSON.stringify(a)}\n${JSON.stringify(b)}`,
      );
      return 0;
    }
    // Celsius is preferred over Farenheit
    if (a.unit === Unit.Celsius) return -1;
    // `b.unit` must be Celsius
    return 1;
  }

  // If they have the same unit and can be parsed, sort by precision (ignore g/cu cm).
  // Check for the empty string because `Number('') === 0`, and `Number.isNaN(0) === false`.
  const aNotParsable = a.value === '' || Number.isNaN(Number(a.value));
  const bNotParsable = b.value === '' || Number.isNaN(Number(b.value));
  if (aNotParsable || bNotParsable) {
    // Return 1 if `a` can't be parsed, -1 if `b` can't be parsed, and 0 if neither can be parsed.
    return (aNotParsable ? 1 : 0) - (bNotParsable ? 1 : 0);
  }

  // Split into the whole and decimal, if available
  const aSplitByDecimal = a.value.split('.');
  const bSplitByDecimal = b.value.split('.');
  // If one or the other does not contain a decimal part
  if (aSplitByDecimal.length === 1 || bSplitByDecimal.length === 1) {
    // Return 1 if `a` doesn't have a decimal part, -1 if `b` doesn't have a decimal part, and 0 if
    // neither has a decimal part.
    return bSplitByDecimal.length - aSplitByDecimal.length;
  }
  // Return whichever has the longer decimal part
  if (bSplitByDecimal[1].length !== aSplitByDecimal[1].length) {
  return bSplitByDecimal[1].length - aSplitByDecimal[1].length;
  }
  // Otherwise, prioritize Wikipedia, since it seems to have better-structured data.
  if (a.source !== b.source) {
    if (a.source === KnownProviders.Wikidata) return -1;
    if (b.source === KnownProviders.Wikidata) return 1;
  }
  return 0;
}

export function deduplicateProperties(properties: NumericProperty[]): NumericProperty[] {
  const seen = new Map<string, NumericProperty>();
  for (const property of properties) {
    if (seen.has(property.value)) {
      const existing = seen.get(property.value)!;
      // Replace unit-less properties when another property with the same value has a unit.
      // Also, prefer Wikidata, as it seems to have better-structured data.
      if (
        (existing.unit === Unit.Unknown && property.unit !== Unit.Unknown) ||
        (property.source === KnownProviders.Wikidata && property.unit !== Unit.Unknown)
      ) {
        seen.set(property.value, property);
      }
      continue;
    }
    seen.set(property.value, property);
  }
  return Array.from(seen.values());
}

/** Properties returned from a provider. */
export type PropertyResult = {
  meltingPoint?: NumericProperty[];
  boilingPoint?: NumericProperty[];
  density?: NumericProperty[];
  /** Maps H-codes to `Hazard`s. */
  hazards?: Map<string, Hazard>;
};
