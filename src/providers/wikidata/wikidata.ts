import { NumericProperty, PropertyResult, Unit } from '@/types/property';
import { KnownProviders, Provider } from '@/types/provider';

export const BASE_URL = 'https://query.wikidata.org';
const PROPERTY_MAP = {
  meltingPoint: 'P2101',
  boilingPoint: 'P2102',
  density: 'P2054',
};
/** Maps Wikidata identifiers to `Unit`s. */
const UNIT_MAP = {
  'http://www.wikidata.org/entity/Q25267': Unit.Celsius,
  'http://www.wikidata.org/entity/Q42289': Unit.Fahrenheit,
  'http://www.wikidata.org/entity/Q13147228': Unit.GramsPerCubicCentimeter,
};

export class WikidataProvider implements Provider {
  name = KnownProviders.Wikidata;

  async getProperties(cid: string): Promise<PropertyResult> {
    const results: PropertyResult = {
      meltingPoint: [],
      boilingPoint: [],
      density: [],
    };
    const data: Response = await this.performQuery(cid);

    for (const row of data.results.bindings) {
      if (row.meltingPoint) {
        results.meltingPoint!.push(
          constructProperty(
            row.item.value,
            PROPERTY_MAP.meltingPoint,
            row.meltingPoint.value,
            row.meltingPointUnit.value,
          ),
        );
      }
      if (row.boilingPoint) {
        results.boilingPoint!.push(
          constructProperty(
            row.item.value,
            PROPERTY_MAP.boilingPoint,
            row.boilingPoint.value,
            row.boilingPointUnit.value,
          ),
        );
      }
      if (row.density) {
        results.density!.push(
          constructProperty(
            row.item.value,
            PROPERTY_MAP.density,
            row.density.value,
            row.densityUnit.value,
            row.densityUnitLabel.value,
          ),
        );
      }
    }

    return results;
  }

  private async performQuery(cid: string) {
    const query = `
      SELECT DISTINCT ?item ?itemLabel ?meltingPoint ?meltingPointUnit ?boilingPoint ?boilingPointUnit ?density ?densityUnit ?densityUnitLabel WHERE {
        ?item p:P662 ?statement0.
        ?statement0 ps:P662 "${cid}".
        {
          OPTIONAL {
            ?item p:P2101 ?statement1.
            ?statement1 psv:P2101 ?valueNode1.
            ?valueNode1 wikibase:quantityAmount ?meltingPoint;
              wikibase:quantityUnit ?meltingPointUnit.
          }
        }
        UNION
        {
          OPTIONAL {
            ?item p:P2102 ?statement2.
            ?statement2 psv:P2102 ?valueNode2.
            ?valueNode2 wikibase:quantityAmount ?boilingPoint;
              wikibase:quantityUnit ?boilingPointUnit.
          }
        }
        UNION
        {
          OPTIONAL {
            ?item p:P2054 ?statement3.
            ?statement3 psv:P2054 ?valueNode3.
            ?valueNode3 wikibase:quantityAmount ?density;
              wikibase:quantityUnit ?densityUnit.
          }
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],mul,en". }
      }
    `;

    const resp = await fetch(BASE_URL + '/sparql?' + new URLSearchParams({ query: query }), {
      headers: {
        Accept: 'application/sparql-results+json',
      },
    });
    return await resp.json();
  }
}

function constructProperty(
  entity: string,
  property: string,
  value: string,
  unit: string,
  unitLabel?: string,
): NumericProperty {
  return {
    value: value,
    unit: UNIT_MAP[unit] ?? Unit.Unknown,
    original: UNIT_MAP[unit] === undefined && typeof unitLabel !== undefined ? value + ' ' + unitLabel : '',
    source: KnownProviders.Wikidata,
    sourceLink: entity + '#' + property,
  };
}
