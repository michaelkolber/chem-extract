import { PropertyResult } from '@/types/property';

export enum KnownProviders {
  PubChem = 'PubChem',
  Wikidata = 'Wikipedia',
}

export interface Provider {
  name: string;
  getProperties(cid: string): Promise<PropertyResult>;
}
