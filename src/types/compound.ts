import * as pubchem from '@/providers/pubchem/pubchem';
import { compareProperties, Properties } from '@/types/property';
import { Provider } from '@/types/provider';

export class Compound {
  /** The unique PubChem CID for this compound. */
  cid: string;
  /** Name used by the user when searching for the compound. */
  name: string;
  iupacName: string;
  /** Link to an image of the skeletal structure of the compound. */
  structureImageLink: string;
  molecularWeight: string;
  properties: Properties = {
    meltingPoint: [],
    boilingPoint: [],
    density: [],
    hazards: [],
  };

  private pc: pubchem.PubChemProvider;
  /** Additional providers used to fetch data. */
  private providers: Provider[];

  /**
   * @param pc The PubChem provider.
   * @param additionalProviders Additional providers.
   */
  constructor(name: string, pc: pubchem.PubChemProvider, additionalProviders?: Provider[]) {
    this.name = name;
    this.pc = pc;
    this.providers = additionalProviders ?? [];
  }

  /**
   * Sets the core fields needed to retrieve all further properties.
   */
  async init() {
    const cf = await this.pc.getCoreFields(this.name);
    this.cid = cf.CID.toString();
    this.iupacName = cf.IUPACName;
    this.structureImageLink = pubchem.BASE_URL + `/rest/pug/compound/cid/${this.cid}/png`;
    this.molecularWeight = cf.MolecularWeight;
  }

  /**
   * Retrieves properties from providers, determining the best value for each
   * property.
   */
  async populate() {
    const pubchemResults = await this.pc.getProperties(this.cid);
    this.properties.meltingPoint = pubchemResults.meltingPoint?.sort(compareProperties) ?? [];
    this.properties.boilingPoint = pubchemResults.boilingPoint?.sort(compareProperties) ?? [];
    this.properties.density = pubchemResults.density?.sort(compareProperties) ?? [];
    this.properties.hazards = Array.from(pubchemResults.hazards?.values() ?? []);
    this.properties.hazards.sort((a, b) => a.code.localeCompare(b.code));
  }
}
