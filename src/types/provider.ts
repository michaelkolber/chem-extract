import { PropertyResult } from '@/types/property';

export enum KnownProviders {
  PubChem = 'PubChem',
}

export interface Provider {
  name: string;
  getProperties(cid: string): Promise<PropertyResult>;
}
