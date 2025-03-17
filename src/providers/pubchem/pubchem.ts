import { PICTOGRAMS } from '@/providers/pubchem/ghs';
import { Hazard, NumericProperty, PropertyResult, Unit } from '@/types/property';
import { KnownProviders, Provider } from '@/types/provider';

export const BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov';
/** Parses GHS hazard statements as they're presented by PUG View. */
export const HAZARD_REGEX = /((?:\+?H\d{3}[A-z]*)+)(?: \(.+\))?: ([^\[]+) \[.+\]/;

export class PubChemProvider implements Provider {
  name = KnownProviders.PubChem;

  static async getSuggestions(query: string): Promise<string[]> {
    const url = constructURL(`/autocomplete/compound/${query}`);
    const resp = await fetch(url);
    const data: Autocomplete.Response = await resp.json();

    if (Object.hasOwn(data.status, 'error') || data.total === 0) {
      return [];
    }
    return (data as Autocomplete.ResponseSuccess).dictionary_terms.compound;
  }

  async getCoreFields(compound: string) {
    const url = constructURL(`/pug/compound/name/${compound}/property/IUPACName,MolecularWeight`);
    const resp = await fetch(url);
    const data: PUG.Response = await resp.json();
    if ('Fault' in data) {
      throw new Error(
        `PUG returned an error when getting core fields for compound '${compound}: ` +
          JSON.stringify(data.Fault, undefined, 2),
      );
    }
    return data.PropertyTable.Properties[0];
  }

  /**
   * 1. Determine which properties in `pl` are understood by the provider.
   * 1. Of those, determine which are available by PubChem for this compound.
   * 1. Get each of those propreties.
   */
  async getProperties(cid: string): Promise<PropertyResult> {
    const knownProperties = {
      meltingPoint: ['Chemical and Physical Properties', 'Experimental Properties', 'Melting Point'],
      boilingPoint: ['Chemical and Physical Properties', 'Experimental Properties', 'Boiling Point'],
      density: ['Chemical and Physical Properties', 'Experimental Properties', 'Density'],
      hazards: ['Safety and Hazards', 'Hazards Identification', 'GHS Classification'],
    };

    const results: PropertyResult = {};
    const index = await this.getIndex(cid);

    if (isInIndex(knownProperties.meltingPoint, index)) {
      const tocHeading = knownProperties.meltingPoint.at(-1)!;
      const data = await this.getSingleProperty(cid, tocHeading);
      const information = data.Record.Section[0].Section?.[0].Section?.[0].Information;
      results.meltingPoint = normalizeNumericInformation(cid, tocHeading, information);
    }

    if (isInIndex(knownProperties.boilingPoint, index)) {
      const tocHeading = knownProperties.boilingPoint.at(-1)!;
      const data = await this.getSingleProperty(cid, tocHeading);
      const information = data.Record.Section[0].Section?.[0].Section?.[0].Information;
      results.boilingPoint = normalizeNumericInformation(cid, tocHeading, information);
    }

    if (isInIndex(knownProperties.density, index)) {
      const tocHeading = knownProperties.density.at(-1)!;
      const data = await this.getSingleProperty(cid, tocHeading);
      const information = data.Record.Section[0].Section?.[0].Section?.[0].Information;
      results.density = normalizeNumericInformation(cid, tocHeading, information);
    }

    if (isInIndex(knownProperties.hazards, index)) {
      const tocHeading = knownProperties.hazards.at(-1)!;
      const data = await this.getSingleProperty(cid, knownProperties.hazards.at(-1)!);
      let information = data.Record.Section[0].Section?.[0].Section?.[0].Information;
      information = information?.filter((e) => e.Name === 'GHS Hazard Statements');
      results.hazards = normalizeHazardInformation(cid, tocHeading, information);
    }

    return results;
  }

  private async getIndex(cid: string) {
    const url = constructURL(`/pug_view/index/compound/${cid}`);
    const resp = await fetch(url);
    const data: PUGView.Response = await resp.json();
    if ('Fault' in data) {
      throw new Error(
        `PUG View returned an error when retrieving index for CID ${cid}: ` + JSON.stringify(data.Fault, undefined, 2),
      );
    }

    return normalizeIndex(data.Record.Section);
  }

  private async getSingleProperty(cid: string, heading: string) {
    const url = BASE_URL + `/rest/pug_view/data/compound/${cid}/json?heading=${heading}`;
    const resp = await fetch(url);
    const data: PUGView.Response = await resp.json();
    if ('Fault' in data) {
      throw new Error(
        `PUG View returned an error when retrieving property '${heading}' for CID ${cid}: ` +
          JSON.stringify(data.Fault, undefined, 2),
      );
    }
    return data;
  }
}

function constructURL(path: string, base = BASE_URL, format = 'json'): string {
  return `${base}/rest${path}/${format}`;
}

interface NormalizedIndex {
  [key: string]: NormalizedIndex | null;
}

function normalizeIndex(index: PUGView.Section) {
  const map: NormalizedIndex = {};
  for (const elem of index) {
    if (elem.Section) {
      map[elem.TOCHeading] = normalizeIndex(elem.Section);
    } else {
      map[elem.TOCHeading] = null;
    }
  }
  return map;
}

function isInIndex(path: string[], index: NormalizedIndex | null): boolean {
  if (path.length === 0) {
    return true;
  }
  if (index !== null && path[0] in index) {
    return isInIndex(path.slice(1), index[path[0]]);
  }
  return false;
}

function determineUnit(str?: string): Unit {
  if (!str) {
    return Unit.Unknown;
  }
  if (str.endsWith('g/cm³') || str.endsWith('g/cu cm')) {
    return Unit.GramsPerCubicCentimeter;
  }
  switch (str?.at(-1)) {
    case 'C':
      return Unit.Celsius;
    case 'F':
      return Unit.Fahrenheit;
    default:
      return Unit.Unknown;
  }
}

function normalizeNumericInformation(
  cid: string,
  tocHeading: string,
  information?: PUGView.Information,
): NumericProperty[] {
  if (!information || information.length === 0) {
    return [];
  }

  const base_property = {
    source: KnownProviders.PubChem,
    sourceLink: BASE_URL + `/compound/${cid}#section=${tocHeading.replaceAll(' ', '-')}`,
  };
  const values = information.map((elem) => elem.Value);
  const normalized: NumericProperty[] = [];

  for (const value of values) {
    if ('Number' in value) {
      const unit = determineUnit(value.Unit);
      for (const number of value.Number) {
        normalized.push({ value: number.toString(), unit: unit, ...base_property });
      }
    } else if ('StringWithMarkup' in value) {
      for (const swm of value.StringWithMarkup) {
        const parts = swm.String.split(' ');
        // If it's a simple string of the form "<value> <unit>", or just "<value>"
        if (parts.length <= 2 || (parts.length === 3 && swm.String.endsWith('g/cu cm'))) {
          const unit = determineUnit(swm.String);
          // It will always be the 0th element, regardless of whether it's
          // "<value> <unit>" or "<value>"
          normalized.push({ value: parts[0], unit: unit, original: swm.String, ...base_property });
        } else {
          normalized.push({
            value: swm.String,
            unit: Unit.Unknown,
            original: swm.String,
            ...base_property,
          });
        }
      }
    }
  }

  return normalized;
}

function normalizeHazardInformation(
  cid: string,
  tocHeading: string,
  information?: PUGView.Information,
): Map<string, Hazard> {
  if (!information || information.length === 0) {
    return new Map();
  }

  const values = information.map((elem) => elem.Value);
  const normalized = new Map<string, Hazard>();

  for (const value of values) {
    if ('StringWithMarkup' in value) {
      for (const swm of value.StringWithMarkup) {
        const m = HAZARD_REGEX.exec(swm.String);
        if (m === null || m.length !== 3) {
          console.error(`Failed to parse hazard '${swm.String}'`);
          continue;
        }
        const [, code, hazardStatement] = m;
        if (!normalized.has(code)) {
          normalized.set(code, {
            code: code,
            hazardStatement: hazardStatement,
            pictogram: PICTOGRAMS[code],
          });
        }
      }
    }
  }

  return normalized;
}
