import { Providers } from '@/providers/constants';

export type Property<T> = {
    value: T;
    /** How the value is displayed in the table. */
    displayName: string;
    /**
     * Maps provider names to the key used to identify the property within that
     * provider. A 2-tuple can be specified instead, with the second element
     * being the sub-property to get.
     */
    providerKeys: { [provider in Providers]: string | [string, string] };
    /** Whether the property is static or dynamically loaded. */
    static?: boolean;
}