import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { WikidataProvider, constructProperty } from './wikidata'; // Adjust path as needed
import { server } from '../../mocks/server'; // Adjust path as needed
import { KnownProviders } from '@/types/provider';
import { NumericProperty, Unit } from '@/types/property';

// --- MSW Setup ---
// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());

// --- Test Suite ---
describe('src/providers/wikidata/wikidata.ts', () => {

  describe('constructProperty', () => {
    const entity = 'http://www.wikidata.org/entity/Q123';
    const property = 'P456';

    it('should create property with known Celsius unit', () => {
      const result = constructProperty(entity, property, '100', 'http://www.wikidata.org/entity/Q25267');
      expect(result).toEqual({
        value: '100',
        unit: Unit.Celsius,
        original: '', // Known unit, original should be empty
        source: KnownProviders.Wikidata,
        sourceLink: `${entity}#${property}`,
      });
    });

     it('should create property with known Fahrenheit unit', () => {
      const result = constructProperty(entity, property, '212', 'http://www.wikidata.org/entity/Q42289');
      expect(result).toEqual({
        value: '212',
        unit: Unit.Fahrenheit,
        original: '',
        source: KnownProviders.Wikidata,
        sourceLink: `${entity}#${property}`,
      });
    });

    it('should create property with known g/cm³ unit', () => {
      const result = constructProperty(entity, property, '1.0', 'http://www.wikidata.org/entity/Q13147228', 'gram per cubic centimetre');
       expect(result).toEqual({
        value: '1.0',
        unit: Unit.GramsPerCubicCentimeter,
        original: '', // Known unit, original should be empty even with label
        source: KnownProviders.Wikidata,
        sourceLink: `${entity}#${property}`,
      });
    });


    it('should create property with unknown unit and store original', () => {
      const unknownUnitUri = 'http://www.wikidata.org/entity/QUnknown';
      const unitLabel = 'unknown unit label';
      const result = constructProperty(entity, property, '50', unknownUnitUri, unitLabel);
      expect(result).toEqual({
        value: '50',
        unit: Unit.Unknown,
        original: `50 ${unitLabel}`, // Constructed from value + unitLabel
        source: KnownProviders.Wikidata,
        sourceLink: `${entity}#${property}`,
      });
    });

     it('should create property with unknown unit and no label', () => {
      const unknownUnitUri = 'http://www.wikidata.org/entity/QUnknown';
      const result = constructProperty(entity, property, '50', unknownUnitUri, undefined); // No unitLabel provided
      expect(result).toEqual({
        value: '50',
        unit: Unit.Unknown,
        original: '', // Should be empty if unitLabel is undefined
        source: KnownProviders.Wikidata,
        sourceLink: `${entity}#${property}`,
      });
    });
  });

  describe('WikidataProvider', () => {
     let provider: WikidataProvider;

     beforeEach(() => {
        provider = new WikidataProvider();
     });

     it('should fetch and process properties for a known CID (Aspirin)', async () => {
        const cid = '2244'; // Corresponds to the success mock in handlers.ts
        const results = await provider.getProperties(cid);

        // Check Melting Point
        expect(results.meltingPoint).toBeDefined();
        expect(results.meltingPoint!.length).toBeGreaterThan(0);
        expect(results.meltingPoint).toContainEqual({
            value: '136',
            unit: Unit.Celsius,
            original: '',
            source: KnownProviders.Wikidata,
            sourceLink: 'http://www.wikidata.org/entity/Q18296#P2101'
        });

        // Check Boiling Point
        expect(results.boilingPoint).toBeDefined();
         expect(results.boilingPoint!.length).toBeGreaterThan(0);
         expect(results.boilingPoint).toContainEqual({
            value: '140',
            unit: Unit.Celsius,
            original: '',
            source: KnownProviders.Wikidata,
            sourceLink: 'http://www.wikidata.org/entity/Q18296#P2102'
        });

        // Check Density (Known Unit)
        expect(results.density).toBeDefined();
        expect(results.density!.length).toBeGreaterThan(0);
         expect(results.density).toContainEqual({
            value: '1.4',
            unit: Unit.GramsPerCubicCentimeter,
            original: '',
            source: KnownProviders.Wikidata,
            sourceLink: 'http://www.wikidata.org/entity/Q18296#P2054'
        });

         // Check Density (Unknown Unit)
         expect(results.density).toContainEqual({
            value: '1400',
            unit: Unit.Unknown,
            original: '1400 kilogram per cubic metre', // From mock data
            source: KnownProviders.Wikidata,
            sourceLink: 'http://www.wikidata.org/entity/Q18296#P2054'
        });
     });

      it('should return empty arrays for a CID with no properties found', async () => {
        const cid = '9999'; // Corresponds to the empty results mock
        const results = await provider.getProperties(cid);

        expect(results.meltingPoint).toEqual([]);
        expect(results.boilingPoint).toEqual([]);
        expect(results.density).toEqual([]);
     });

      it('should return empty arrays for a CID not found', async () => {
        const cid = '123456789'; // Default case in mock handler (not found)
        const results = await provider.getProperties(cid);

        expect(results.meltingPoint).toEqual([]);
        expect(results.boilingPoint).toEqual([]);
        expect(results.density).toEqual([]);
     });

      it('should handle fetch errors gracefully', async () => {
        const cid = 'error'; // Triggers a 500 error in the mock handler

        // The current implementation doesn't catch errors within performQuery
        // It relies on the caller (or global error handling) to catch fetch errors.
        // So, we expect the promise to reject.
        await expect(provider.getProperties(cid)).rejects.toThrow();

        // To test more specific error handling (e.g., returning empty results on error),
        // the provider's code would need modification (e.g., try/catch around fetch).
     });
  });
});
