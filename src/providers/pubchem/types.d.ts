type PickOne<T> = { [P in keyof T]: Record<P, T[P]> & Partial<Record<Exclude<keyof T, P>, undefined>> }[keyof T];

/** Common response upon failure for both PUG and PUG View. */
interface ResponseFailure {
  Fault: {
    Code: string;
    Message: string;
    Details?: string[];
  };
}

/**
 * Autocomplete API \
 * Docs: https://pubchem.ncbi.nlm.nih.gov/docs/autocomplete
 */
declare namespace Autocomplete {
  interface ResponseSuccess {
    status: {
      code: number;
    };
    total: number;
    dictionary_terms: {
      compound: string[];
    }
  }
  interface ResponseFailure {
    status: {
      error: string
    };
    total: number;
  }

  type Response = ResponseSuccess | ResponseFailure;
}

/**
 * PUG REST API \
 * Docs: https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest \
 * Schema: https://pubchem.ncbi.nlm.nih.gov/pug_rest/pug_rest.xsd
 */
declare namespace PUG {
  interface ResponseSuccess {
    PropertyTable: {
      Properties: {
        CID: number;
        MolecularWeight: string;
        IUPACName: string;
      }[];
    };
  }

  type Response = ResponseSuccess | ResponseFailure;
}

/**
 * PUG View API \
 * Docs: https://pubchem.ncbi.nlm.nih.gov/docs/pug-view \
 * Schema: https://pubchem.ncbi.nlm.nih.gov/pug_view/pug_view.xsd
 */
declare namespace PUGView {
  type Information = Array<{
    Name?: string;
    Value: ({ Number: number[] } | { StringWithMarkup: Array<{ String: string }> }) & { Unit?: string };
  }>;

  type Section = Array<{
    TOCHeading: string;
    Description?: string;
    Section?: Section;
    Information?: Information;
  }>;

  interface ResponseSuccess {
    Record: {
      RecordNumber: number;
      RecordTitle: string;
      RecordType: string;
      Information?: any[];
      Reference?: any[];
      Section: Section;
    };
  }

  type Response = ResponseSuccess | ResponseFailure;
}
