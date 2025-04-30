import { describe, it, expect } from 'vitest';
import {
  constructURL,
  normalizeIndex,
  isInIndex,
  determineUnit,
  normalizeNumericInformation,
  normalizeHazardInformation,
  HAZARD_REGEX,
  BASE_URL,
} from './pubchem'; // Adjust the import path if necessary
import { Unit } from '@/types/property';
import type * as PUGView from './types.d'; // Assuming types are in types.d.ts

describe('src/providers/pubchem/pubchem.ts', () => {
  describe('constructURL', () => {
    it('should construct a URL with default base and format', () => {
      const path = '/test/path';
      const expectedUrl = `${BASE_URL}/rest${path}/json`;
      expect(constructURL(path)).toBe(expectedUrl);
    });

    it('should construct a URL with a custom base', () => {
      const path = '/test/path';
      const customBase = 'http://example.com';
      const expectedUrl = `${customBase}/rest${path}/json`;
      expect(constructURL(path, customBase)).toBe(expectedUrl);
    });

    it('should construct a URL with a custom format', () => {
      const path = '/test/path';
      const customFormat = 'xml';
      const expectedUrl = `${BASE_URL}/rest${path}/${customFormat}`;
      expect(constructURL(path, BASE_URL, customFormat)).toBe(expectedUrl);
    });

     it('should construct a URL with custom base and format', () => {
      const path = '/test/path';
      const customBase = 'http://example.com';
      const customFormat = 'xml';
      const expectedUrl = `${customBase}/rest${path}/${customFormat}`;
      expect(constructURL(path, customBase, customFormat)).toBe(expectedUrl);
    });
  });

  describe('normalizeIndex', () => {
    it('should normalize a simple PUGView section array', () => {
      const input: PUGView.Section = [
        { TOCHeading: 'Section 1' },
        { TOCHeading: 'Section 2' },
      ];
      const expected = {
        'Section 1': null,
        'Section 2': null,
      };
      expect(normalizeIndex(input)).toEqual(expected);
    });

    it('should normalize nested PUGView sections', () => {
      const input: PUGView.Section = [
        {
          TOCHeading: 'Top Section',
          Section: [
            { TOCHeading: 'Nested Section 1' },
            {
              TOCHeading: 'Nested Section 2',
              Section: [{ TOCHeading: 'Deep Section' }],
            },
          ],
        },
        { TOCHeading: 'Another Top Section' },
      ];
      const expected = {
        'Top Section': {
          'Nested Section 1': null,
          'Nested Section 2': {
            'Deep Section': null,
          },
        },
        'Another Top Section': null,
      };
      expect(normalizeIndex(input)).toEqual(expected);
    });

    it('should return an empty object for an empty input array', () => {
      const input: PUGView.Section = [];
      const expected = {};
      expect(normalizeIndex(input)).toEqual(expected);
    });
  });

  describe('isInIndex', () => {
    const testIndex = {
      'Section A': {
        'SubSection A1': null,
        'SubSection A2': {
          'Deep A2a': null,
        },
      },
      'Section B': null,
    };

    it('should return true for a path that exists', () => {
      expect(isInIndex(['Section A', 'SubSection A1'], testIndex)).toBe(true);
      expect(isInIndex(['Section A', 'SubSection A2', 'Deep A2a'], testIndex)).toBe(true);
      expect(isInIndex(['Section B'], testIndex)).toBe(true);
      expect(isInIndex(['Section A'], testIndex)).toBe(true);
    });

    it('should return true for an empty path', () => {
      expect(isInIndex([], testIndex)).toBe(true);
      expect(isInIndex([], null)).toBe(true); // Empty path exists even in null index
    });

    it('should return false for a path that does not fully exist', () => {
      expect(isInIndex(['Section A', 'SubSection A3'], testIndex)).toBe(false);
      expect(isInIndex(['Section A', 'SubSection A2', 'Deep A2b'], testIndex)).toBe(false);
      expect(isInIndex(['Section C'], testIndex)).toBe(false);
    });

     it('should return false for a path when the index is null', () => {
      expect(isInIndex(['Section A'], null)).toBe(false);
    });

     it('should return false for a non-empty path into a null sub-index', () => {
       // 'Section B' exists but is null, so 'SubSection B1' cannot exist within it.
      expect(isInIndex(['Section B', 'SubSection B1'], testIndex)).toBe(false);
    });
  });

   describe('determineUnit', () => {
    it('should identify Celsius', () => {
      expect(determineUnit('100 °C')).toBe(Unit.Celsius);
      expect(determineUnit('25C')).toBe(Unit.Celsius);
    });

    it('should identify Fahrenheit', () => {
      expect(determineUnit('212 °F')).toBe(Unit.Fahrenheit);
       expect(determineUnit('77F')).toBe(Unit.Fahrenheit);
    });

    it('should identify g/cm³', () => {
      expect(determineUnit('1.0 g/cm³')).toBe(Unit.GramsPerCubicCentimeter);
    });

     it('should identify g/cu cm', () => {
      expect(determineUnit('0.9 g/cu cm')).toBe(Unit.GramsPerCubicCentimeter);
    });

    it('should return Unknown for unrecognized units', () => {
      expect(determineUnit('100 K')).toBe(Unit.Unknown);
      expect(determineUnit('5 atmospheres')).toBe(Unit.Unknown);
      expect(determineUnit('random string')).toBe(Unit.Unknown);
    });

    it('should return Unknown for empty or undefined input', () => {
      expect(determineUnit('')).toBe(Unit.Unknown);
      expect(determineUnit(undefined)).toBe(Unit.Unknown);
      expect(determineUnit()).toBe(Unit.Unknown);
    });
  });

  // Add HAZARD_REGEX tests next
  describe('HAZARD_REGEX', () => {
    it('should match basic H-code and statement', () => {
      const str = 'H300: Fatal if swallowed [Category 1]';
      const match = str.match(HAZARD_REGEX);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('H300');
      expect(match![2].trim()).toBe('Fatal if swallowed');
    });

    it('should match combined H-codes', () => {
      const str = 'H302+H312: Harmful if swallowed or in contact with skin [Category 4]';
      const match = str.match(HAZARD_REGEX);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('H302+H312');
      expect(match![2].trim()).toBe('Harmful if swallowed or in contact with skin');
    });

     it('should match H-codes with suffixes', () => {
      const str = 'H373a: May cause damage to organs through prolonged or repeated exposure [Category 2]';
      const match = str.match(HAZARD_REGEX);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('H373a');
       expect(match![2].trim()).toBe('May cause damage to organs through prolonged or repeated exposure');
    });

     it('should match combined H-codes with suffixes', () => {
      const str = 'H301+H311+H331a: Toxic if swallowed, in contact with skin or if inhaled [Category 3]';
      const match = str.match(HAZARD_REGEX);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('H301+H311+H331a');
       expect(match![2].trim()).toBe('Toxic if swallowed, in contact with skin or if inhaled');
    });


    it('should match statements with parentheses after code', () => {
      const str = 'H319 (Warning): Causes serious eye irritation [Category 2A]';
      const match = str.match(HAZARD_REGEX);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('H319');
      expect(match![2].trim()).toBe('Causes serious eye irritation');
    });

    it('should not match if format is incorrect', () => {
      expect('Invalid statement'.match(HAZARD_REGEX)).toBeNull();
      expect('H300 Fatal if swallowed'.match(HAZARD_REGEX)).toBeNull(); // Missing colon
      expect(': Missing code'.match(HAZARD_REGEX)).toBeNull();
    });
  });

  // Add normalizeNumericInformation tests
  describe('normalizeNumericInformation', () => {
    const cid = '12345';
    const tocHeading = 'Test Property';
    const baseExpected = {
      source: 'PubChem',
      sourceLink: `${BASE_URL}/compound/${cid}#section=${tocHeading.replaceAll(' ', '-')}`,
    };

    it('should normalize data with Number and Unit', () => {
      const info: PUGView.Information = [
        {
          Name: 'Test',
          Value: { Number: [25], Unit: '°C' }
        }
      ];
      const expected: NumericProperty[] = [
        { value: '25', unit: Unit.Celsius, ...baseExpected }
      ];
      expect(normalizeNumericInformation(cid, tocHeading, info)).toEqual(expected);
    });

     it('should normalize data with multiple Numbers and Unit', () => {
      const info: PUGView.Information = [
        {
          Name: 'Test',
          Value: { Number: [10, 20], Unit: '°F' }
        }
      ];
      const expected: NumericProperty[] = [
        { value: '10', unit: Unit.Fahrenheit, ...baseExpected },
        { value: '20', unit: Unit.Fahrenheit, ...baseExpected }
      ];
      expect(normalizeNumericInformation(cid, tocHeading, info)).toEqual(expected);
    });


    it('should normalize StringWithMarkup "<value> <unit>"', () => {
      const info: PUGView.Information = [
        {
          Name: 'Test',
          Value: { StringWithMarkup: [{ String: '1.2 g/cm³' }] }
        }
      ];
      const expected: NumericProperty[] = [
        { value: '1.2', unit: Unit.GramsPerCubicCentimeter, original: '1.2 g/cm³', ...baseExpected }
      ];
      expect(normalizeNumericInformation(cid, tocHeading, info)).toEqual(expected);
    });

      it('should normalize StringWithMarkup "<value>"', () => {
      const info: PUGView.Information = [
        {
          Name: 'Test',
          Value: { StringWithMarkup: [{ String: '-10' }] } // Assume unit comes from context elsewhere
        }
      ];
      const expected: NumericProperty[] = [
        { value: '-10', unit: Unit.Unknown, original: '-10', ...baseExpected }
      ];
      expect(normalizeNumericInformation(cid, tocHeading, info)).toEqual(expected);
    });


    it('should normalize StringWithMarkup with complex string as Unknown unit', () => {
      const complexString = 'Approx 100-105 °C (decomposes)';
      const info: PUGView.Information = [
        {
          Name: 'Test',
          Value: { StringWithMarkup: [{ String: complexString }] }
        }
      ];
      const expected: NumericProperty[] = [
        { value: complexString, unit: Unit.Unknown, original: complexString, ...baseExpected }
      ];
      expect(normalizeNumericInformation(cid, tocHeading, info)).toEqual(expected);
    });

     it('should handle mixed Number and StringWithMarkup', () => {
      const info: PUGView.Information = [
        {
          Name: 'Test',
          Value: { Number: [5], Unit: '°C' }
        },
        {
           Name: 'Test',
           Value: { StringWithMarkup: [{ String: '6 F' }] }
        }
      ];
      const expected: NumericProperty[] = [
        { value: '5', unit: Unit.Celsius, ...baseExpected },
        { value: '6', unit: Unit.Fahrenheit, original: '6 F', ...baseExpected }
      ];
       // Need to sort results because order isn't guaranteed
       const result = normalizeNumericInformation(cid, tocHeading, info).sort((a, b) => a.value.localeCompare(b.value));
      expect(result).toEqual(expected);
    });


    it('should return empty array for undefined information', () => {
      expect(normalizeNumericInformation(cid, tocHeading, undefined)).toEqual([]);
    });

    it('should return empty array for empty information array', () => {
      expect(normalizeNumericInformation(cid, tocHeading, [])).toEqual([]);
    });
  });

  // Add normalizeHazardInformation tests
  describe('normalizeHazardInformation', () => {
    const cid = '67890';
    const tocHeading = 'GHS Hazards';

    it('should normalize valid hazard statements', () => {
      const info: PUGView.Information = [
        {
          Name: 'GHS Hazard Statements',
          Value: {
            StringWithMarkup: [
              { String: 'H300: Fatal if swallowed [Category 1]' },
              { String: 'H315 (Warning): Causes skin irritation [Category 2]' },
            ],
          },
        },
      ];
      const expected = new Map<string, Hazard>([
        ['H300', { code: 'H300', hazardStatement: 'Fatal if swallowed', pictogram: 'Skull and crossbones' }], // Assuming PICTOGRAMS maps H300
        ['H315', { code: 'H315', hazardStatement: 'Causes skin irritation', pictogram: 'Exclamation mark' }], // Assuming PICTOGRAMS maps H315
      ]);
      expect(normalizeHazardInformation(cid, tocHeading, info)).toEqual(expected);
    });

    it('should skip invalid hazard statements', () => {
      const info: PUGView.Information = [
        {
          Name: 'GHS Hazard Statements',
          Value: {
            StringWithMarkup: [
              { String: 'Invalid Statement' },
              { String: 'H330: Fatal if inhaled [Category 1]' },
              { String: 'H300 Missing colon' },
            ],
          },
        },
      ];
      const expected = new Map<string, Hazard>([
        ['H330', { code: 'H330', hazardStatement: 'Fatal if inhaled', pictogram: 'Skull and crossbones' }], // Assuming PICTOGRAMS maps H330
      ]);
      expect(normalizeHazardInformation(cid, tocHeading, info)).toEqual(expected);
    });

     it('should handle combined codes correctly', () => {
      const info: PUGView.Information = [
        {
          Name: 'GHS Hazard Statements',
          Value: {
            StringWithMarkup: [
              { String: 'H302+H312: Harmful if swallowed or in contact with skin [Category 4]' },
            ],
          },
        },
      ];
      const expected = new Map<string, Hazard>([
        ['H302+H312', { code: 'H302+H312', hazardStatement: 'Harmful if swallowed or in contact with skin', pictogram: 'Exclamation mark' }], // Assuming PICTOGRAMS maps H302+H312
      ]);
      expect(normalizeHazardInformation(cid, tocHeading, info)).toEqual(expected);
    });


    it('should return empty map for undefined information', () => {
      expect(normalizeHazardInformation(cid, tocHeading, undefined)).toEqual(new Map());
    });

    it('should return empty map for empty information array', () => {
      expect(normalizeHazardInformation(cid, tocHeading, [])).toEqual(new Map());
    });

     it('should return empty map if Value is not StringWithMarkup', () => {
       const info: PUGView.Information = [
        {
          Name: 'GHS Hazard Statements',
          Value: { Number: [123] } // Incorrect type
        }
      ];
      expect(normalizeHazardInformation(cid, tocHeading, info)).toEqual(new Map());
    });
  });
});

// --- MSW Setup and PubChemProvider Tests ---
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from '../../mocks/server'; // Adjust path if needed
import { PubChemProvider } from './pubchem';
import { Hazard, NumericProperty } from '@/types/property'; // Import necessary types

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());


describe('PubChemProvider', () => {
  let provider: PubChemProvider;

  beforeEach(() => {
    provider = new PubChemProvider();
  });

  describe('getSuggestions', () => {
    it('should return suggestions for a valid query', async () => {
      const suggestions = await PubChemProvider.getSuggestions('aspirin');
      expect(suggestions).toEqual(['Aspirin', 'Acetaminophen']); // Based on mock handler
    });

     it('should return an empty array for a query yielding no results', async () => {
        const suggestions = await PubChemProvider.getSuggestions('empty'); // Uses specific mock
        expect(suggestions).toEqual([]);
     });

    it('should return an empty array on API error', async () => {
      // Note: The handler for 'error' returns a specific structure.
      // The code currently checks `Object.hasOwn(data.status, 'error')`
      const suggestions = await PubChemProvider.getSuggestions('error');
      expect(suggestions).toEqual([]);
    });
  });

  describe('getCoreFields', () => {
    it('should return core fields for a valid compound name', async () => {
      const fields = await provider.getCoreFields('validCompound');
       // Based on mockCoreFieldsSuccess in handlers.ts
      expect(fields.CID).toBe(123);
      expect(fields.IUPACName).toBe('Test IUPAC Name');
      expect(fields.MolecularWeight).toBe('180.16');
    });

    it('should throw an error if PUG returns a fault', async () => {
      await expect(provider.getCoreFields('fault')).rejects.toThrow(/PUG returned an error/);
    });
  });

   describe('getProperties', () => {
    // Using CID '123' which corresponds to mockIndexSuccess in handlers.ts
    // mockIndexSuccess includes Melting Point, Boiling Point, GHS Classification, but not Density.
    // mockMeltingPointSuccess provides data for Melting Point.
    // Other properties currently return empty data in the mock handlers.

    it('should fetch and normalize properties present in the index', async () => {
      const properties = await provider.getProperties('123');

      // Check Melting Point (data provided by mockMeltingPointSuccess)
      expect(properties.meltingPoint).toBeDefined();
      expect(properties.meltingPoint?.length).toBeGreaterThan(0);
      const mp = properties.meltingPoint![0];
      expect(mp.value).toBe('135');
      expect(mp.unit).toBe(Unit.Celsius);
      expect(mp.source).toBe('PubChem');

      // Check Boiling Point (present in index, but mock handler returns empty data for now)
      // The test should reflect that the property was checked for but returned no data.
      expect(properties.boilingPoint).toBeDefined();
      expect(properties.boilingPoint).toEqual([]); // Because mock returns empty info

       // Check GHS Hazards (present in index, but mock handler returns empty data for now)
      expect(properties.hazards).toBeDefined();
      expect(properties.hazards?.size).toBe(0); // Because mock returns empty info

      // Check Density (NOT present in index)
      expect(properties.density).toBeUndefined();
    });

     it('should handle PUG View fault when fetching index', async () => {
         // CID 'fault' triggers index fetch fault in mock handler
         await expect(provider.getProperties('fault')).rejects.toThrow(/PUG View returned an error when retrieving index/);
     });

      it('should handle PUG View fault when fetching a specific property', async () => {
         // CID 'propertyFault' triggers property fetch fault in mock handler
         // Note: This assumes getIndex succeeds but getSingleProperty fails.
         // The current handlers need adjustment if getIndex should succeed for 'propertyFault'.
         // Let's assume for now getIndex works for 'propertyFault' but getSingleProperty for 'Melting Point' fails.
         // We might need more sophisticated handlers or test setup for fine-grained error testing.

         // For simplicity, let's assume the first property fetch ('Melting Point') fails.
         // We'd need to modify the handler to allow index success but property failure for a specific CID.
         // Let's simulate this by expecting the error from the first getSingleProperty call.
         // **Current handlers might not perfectly support this specific scenario without modification.**
         // **Test adjusted based on current handler limitations - it will likely fail at getIndex first if CID is 'propertyFault'**

         // If we use a CID that succeeds for index but fails for property:
         // await expect(provider.getProperties('propertyFault')).rejects.toThrow(/PUG View returned an error when retrieving property 'Melting Point'/);

         // With current handlers, testing property fault is tricky. Let's stick to index fault for now.
         // If CID '123' is used, but we modify the server handler *during* the test:
         server.use(
             http.get(`${BASE_URL}/rest/pug_view/data/compound/123/json`, ({ request }) => {
                  const url = new URL(request.url);
                  const heading = url.searchParams.get('heading');
                  if (heading === 'Melting Point') {
                      // Import mockPugViewFault from handlers.ts or define it here
                      const mockPugViewFault: PUGView.Fault = { Fault: { Code: 'Test', Message: 'Test Fault', Details: [] } };
                      return HttpResponse.json(mockPugViewFault, { status: 404 });
                  }
                  // Fallback for other properties (return empty for simplicity)
                  return HttpResponse.json({ Record: { RecordNumber: 123, Section: [] } });
             })
         );

         await expect(provider.getProperties('123')).rejects.toThrow(/PUG View returned an error when retrieving property 'Melting Point'/);
     });

     // Add more tests for getProperties:
     // - Different combinations of properties available/unavailable in index.
     // - Cases where normalization functions produce specific outputs (e.g., complex strings, multiple values).
     //   (Requires more detailed mock data in handlers.ts for properties like Boiling Point, Density, GHS).
  });

  // Note: Testing private methods like getIndex and getSingleProperty directly isn't standard practice.
  // Their behavior is tested indirectly through getProperties.
  // We test their error handling by triggering faults in the fetch calls they make.
});
