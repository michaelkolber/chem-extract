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

export class Compound {
    cid: string;
    name: string;
    /** Name used by the user when searching for the compound. */
    lookupName: string;
    structureLink: string;
    molecularWeight: string;
    meltingPoint: string[];
    boilingPoint: string[];
    density: string[];
    hazard: string[];

    constructor(cid: string, name: string, molecularWeight: string,) {
        this.cid = cid;
        this.name = name;
        this.molecularWeight = molecularWeight;
    }

    // paths is a list of dot-separated strings of the paths to the properties
    // returns a list of paths that are available
    async checkProperties(paths: string[]): Promise<string[]> {
        const found: string[] = [];  // Headings we've found in the index
        const requestPath = `/pug_view/index/compound/${this.cid}/json`;
        const data = await (await fetch(BASE_URL + requestPath)).json();
        for (const path of paths) {
            const segments = path.split('.');
            let node: any[] = data.Record.Section;
            for (const segment of segments) {
                const child = node.find((elem) => elem.TOCHeading === segment);
                if (child === undefined) {
                    // We couldn't follow the path
                    break
                }
                if (!child.Section) {
                    // We finished
                    found.push(path);
                    break;
                }
                node = child.Section;
            }
            // const res = segments.reduce((prev: any[], curr) => prev.find((val) => val.TOCHeading === curr), data.Record.Section);
            // if (res !== undefined) {
            //     found.push(path);
            // }
        }
        return found;
    }

    // path is a dot-seprated string of the path to the property
    // informationName is the name of the specific information to get
    async getProperty(path: string, informationName?: string): Promise<string[]> {
        const segments = path.split('.');
        const heading = segments.at(-1);

        const requestPath = `/pug_view/data/compound/${this.cid}/json?heading=${heading}`;
        const data = await (await fetch(BASE_URL + requestPath)).json();
        let info = segments.reduce((node) => node.Section[0], data.Record).Information;
        // let node = data.Record;
        // for (let i = 0; i < segments.length; i++) {
        //     node = node.Section[0];
        // }
        if (informationName) {
            info = info.filter((elem) => elem.Name === informationName);
        }
        const values: any[] = info.map((elem) => elem.Value);
        return values.map((value) => {
            if (value.StringWithMarkup) {
                return value.StringWithMarkup.map((val) => val.String);
            }
            if (value.Number) {
                let v = value.Number.join(', ');
                if (value.Unit) {
                    v += ` ${value.Unit}`;
                }
                return v;
            }
        }).flat();
    }

    async update() {
        this.structureLink = BASE_URL + `/pug/compound/cid/${this.cid}/png`
        // Start off with everything else as `?` and replace what we can find
        this.meltingPoint = ['?'];
        this.boilingPoint = ['?'];
        this.density = ['?'];
        this.hazard = ['?'];

        const paths = [
            'Chemical and Physical Properties.Experimental Properties.Melting Point',
            'Chemical and Physical Properties.Experimental Properties.Boiling Point',
            'Chemical and Physical Properties.Experimental Properties.Density',
            'Safety and Hazards.Hazards Identification.GHS Classification',
        ];
        // Check the index to see what properties we have available
        const found = await this.checkProperties(paths);
        for (const path of found) {
            let value = await this.getProperty(path);
            switch (path.split('.').at(-1)) {
                case 'Melting Point':
                    this.meltingPoint = value;
                    break;
                case 'Boiling Point':
                    this.boilingPoint = value;
                    break;
                case 'Density':
                    this.density = value;
                    break;
                case 'GHS Classification':
                    value = await this.getProperty(path, 'GHS Hazard Statements');
                    this.hazard = value;
                    break;
            }
        }

        // const sections: any[] = data.Record.Section;
        // sections.find((section: any) => section.TOCHeading === 'Chemical and Physical Properties')
        //     .Section.find((section: any) => section.TOCHeading === 'Experimental Properties')
        //     .Section.forEach((section: any) => {
        //         if (['Boiling Point', 'Melting Point', 'Density'].includes(section.TOCHeading)) {
        //             headings.push(section.TOCHeading);
        //         }
        //     });
        // sections.find((section: any) => section.TOCHeading === 'Safety and Hazards')
        //     .Section.find((section: any) => section.TOCHeading === 'Hazards Identification')
        //     .Section.forEach((section: any) => {
        //         if (['GHS Classification'].includes(section.TOCHeading)) {
        //             headings.push(section.TOCHeading);
        //         }
        //     });

        // for (const heading of headings) {
        //     path = `/pug_view/data/compound/${this.cid}/json?heading=${heading.replaceAll(' ', '+')}`;
        //     resp = await fetch(BASE_URL + path);
        //     data = await resp.json();
        //     const properties: any[] = data.Record.Section[0].Section[0].Section[0].Information;
        //     switch (heading) {
        //         case 'Melting Point':
        //             this.meltingPoint = properties.map((property) => property.Value.StringWithMarkup[0].String).join('\n') || '?';
        //             break;
        //         case 'Boiling Point':
        //             this.boilingPoint = properties.map((property) => property.Value.StringWithMarkup[0].String).join('\n') || '?';
        //             break;
        //         case 'Density':
        //             this.density = properties.map((property) => property.Value.StringWithMarkup[0].String).join('\n') || '?';
        //             break;
        //         case 'GHS Classification':
        //             this.hazard = properties.filter((property) => property.Name === 'GHS Hazard Statements').map((property: any) => property.Value.StringWithMarkup.map((hazard) => hazard.String)).flat();
        //             break;
        //         default:
        //             break;
        //     }
        // }
    }
}
