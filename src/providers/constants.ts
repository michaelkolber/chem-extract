import { Property } from "@/models/property";

export enum Providers {
    PUBCHEM
}

export interface Provider {
    getProperties(identifier: string, properties: Property<any>[]): Promise<any>;
}