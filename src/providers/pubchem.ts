const BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest';

export async function getSuggestions(query: string) {
    const path = `/autocomplete/compound/${query}/json`;
    const resp = await fetch(BASE_URL + path);
    const data = await resp.json();

    if (data['total'] === 0) {
        return [];
    }
    return data.dictionary_terms.compound
}

export async function getCompound(name: string) {
    const path = `/pug/compound/name/${name}/property/IUPACName,MolecularWeight/json`;
    const resp = await fetch(BASE_URL + path);
    const data = await resp.json();

    const properties = data.PropertyTable.Properties[0];
    return new Compound(properties.CID, properties.IUPACName, properties.MolecularWeight)
}

