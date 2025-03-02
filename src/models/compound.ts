import { Property } from "@/models/property";
import { Providers, Provider } from "@/providers/constants";

/**
 * Compound represents a chemical compound.
 */
export type Compound = {
    cid: string;
    name: Property<string>;
    structureLink: string;
    molecularWeight: Property<string>;
    meltingPoint: Property<string[]>;
    boilingPoint: Property<string[]>;
    density: Property<string[]>;
    hazard: Property<string[]>;
}

export function newCompound(cid: string, name: string, molecularWeight: string): Compound {
    return {
        cid: cid,
        name: {
            value: name,
            displayName: 'Name',
            providerKeys: { [Providers.PUBCHEM]: 'IUPACName' },
            static: true,
        },
        structureLink: '',
        molecularWeight: {
            value: '',
            displayName: 'Molecular Weight (g/mol)',
            providerKeys: { [Providers.PUBCHEM]: 'MolecularWeight' },
            static: true,
        },
        meltingPoint: {
            value: [],
            displayName: 'Melting Point (°C)',
            providerKeys: { [Providers.PUBCHEM]: 'Chemical and Physical Properties.Experimental Properties.MeltingPoint' }
        },
        boilingPoint: {
            value: [],
            displayName: 'Boiling Point (°C)',
            providerKeys: { [Providers.PUBCHEM]: 'Chemical and Physical Properties.Experimental Properties.BoilingPoint' }
        },
        density: {
            value: [],
            displayName: 'Density (g/cm³)',
            providerKeys: { [Providers.PUBCHEM]: 'Chemical and Physical Properties.Experimental Properties.Density' }
        },
        hazard: {
            value: [],
            displayName: 'Hazard',
            providerKeys: { [Providers.PUBCHEM]: ['Safety and Hazards.Hazards Identification.GHS Classification', 'GHS Hazard Statements'] }
        },
    }
}

export function updateCompound(c: Compound, ps: Provider[]) {
    const properties = Object.entries(c).filter(([k, v]) => typeof v === 'object' && !v.static);
    for (const provider of ps) {
        provider.getProperties(c.cid, properties)
        });
    }
}

// returns a list of paths that are available
async function checkProperties(c: Compound): Promise<string[]> {
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
    async getProperty(path: string, informationName ?: string): Promise < string[] > {
    const segments = path.split('.');
    const heading = segments.at(-1);

    const requestPath = `/pug_view/data/compound/${this.cid}/json?heading=${heading}`;
    const data = await (await fetch(BASE_URL + requestPath)).json();
    let info = segments.reduce((node) => node.Section[0], data.Record).Information;
    // let node = data.Record;
    // for (let i = 0; i < segments.length; i++) {
    //     node = node.Section[0];
    // }
    if(informationName) {
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
}
}
