import { http, HttpResponse } from 'msw';
import { BASE_URL } from '@/providers/pubchem/pubchem'; // Adjust path as needed

// Define default mock data structures here if needed, or define per test
// Example: Mock data for suggestions
const mockSuggestionsSuccess: Autocomplete.ResponseSuccess = {
  dictionary_terms: {
    compound: ['Aspirin', 'Acetaminophen'],
  },
  total: 2,
};

const mockSuggestionsEmpty: Autocomplete.ResponseSuccess = {
    dictionary_terms: {
        compound: [],
    },
    total: 0,
};

// Example: Mock data for core fields
const mockCoreFieldsSuccess: PUG.Response = {
  PropertyTable: {
    Properties: [
      {
        CID: 123,
        IUPACName: 'Test IUPAC Name',
        MolecularWeight: '180.16', // Example value
      },
    ],
  },
};

// Example: Mock data for index
const mockIndexSuccess: PUGView.Response = {
    Record: {
        RecordType: 'CID',
        RecordNumber: 123,
        Section: [
            { TOCHeading: 'Chemical and Physical Properties', Section: [
                { TOCHeading: 'Experimental Properties', Section: [
                    { TOCHeading: 'Melting Point' },
                    { TOCHeading: 'Boiling Point' },
                    // Density missing in this mock example
                ]}
            ]},
            { TOCHeading: 'Safety and Hazards', Section: [
                { TOCHeading: 'Hazards Identification', Section: [
                    { TOCHeading: 'GHS Classification' }
                ]}
            ]}
        ]
    }
};

// Example: Mock data for Melting Point property
const mockMeltingPointSuccess: PUGView.Response = {
    Record: {
        RecordType: 'CID',
        RecordNumber: 123,
        Section: [{ // Structure follows the request path
            TOCHeading: 'Chemical and Physical Properties', Section: [{
                TOCHeading: 'Experimental Properties', Section: [{
                    TOCHeading: 'Melting Point',
                    Information: [{ Name: 'Melting Point', Value: { Number: [135], Unit: '°C' } }]
                }]
            }]
        }]
    }
};
// Add similar mocks for Boiling Point, Density, GHS Hazards as needed

// Example: PUG Fault response
const mockPugFault: PUG.Fault = {
  Fault: {
    Code: 'PUG.ServerFault',
    Message: 'Server error occurred',
    Details: ['Details about the server error'],
  },
};

// Example: PUG View Fault response
const mockPugViewFault: PUGView.Fault = {
    Fault: {
        Code: 'PUGView.NotFound',
        Message: 'Identifier not found',
        Details: ['Details about the view error']
    }
};


export const handlers = [
  // Mock for getSuggestions (success)
  http.get(`${BASE_URL}/rest/autocomplete/compound/:query/json`, ({ params }) => {
     // You could vary response based on params.query if needed
    if (params.query === 'empty') {
         return HttpResponse.json(mockSuggestionsEmpty);
    }
    return HttpResponse.json(mockSuggestionsSuccess);
  }),

  // Mock for getSuggestions (error - example, modify as needed)
   http.get(`${BASE_URL}/rest/autocomplete/compound/error/json`, () => {
    return HttpResponse.json({ status: { error: 'Simulated error' } }, { status: 500 });
  }),


  // Mock for getCoreFields (success)
  http.get(`${BASE_URL}/rest/pug/compound/name/:compound/property/IUPACName,MolecularWeight/json`, ({ params }) => {
     if (params.compound === 'fault') {
        return HttpResponse.json(mockPugFault, { status: 400 }); // Or appropriate status
     }
    return HttpResponse.json(mockCoreFieldsSuccess);
  }),

   // Mock for getIndex (success)
   http.get(`${BASE_URL}/rest/pug_view/index/compound/:cid/json`, ({ params }) => {
       if (params.cid === 'fault') {
           return HttpResponse.json(mockPugViewFault, { status: 404 });
       }
       // Customize based on CID if necessary for different test scenarios
       return HttpResponse.json(mockIndexSuccess);
   }),

    // Mock for getSingleProperty (Melting Point - success)
    http.get(`${BASE_URL}/rest/pug_view/data/compound/:cid/json`, ({ request, params }) => {
        const url = new URL(request.url);
        const heading = url.searchParams.get('heading');

        if (params.cid === 'propertyFault') {
             return HttpResponse.json(mockPugViewFault, { status: 404 });
        }

        // Return different data based on the heading
        if (heading === 'Melting Point') {
            return HttpResponse.json(mockMeltingPointSuccess);
        }
        if (heading === 'Boiling Point') {
             // Define and return mockBoilingPointSuccess
             // For now, return a generic success or empty data
             return HttpResponse.json({ Record: { RecordNumber: params.cid, Section: [] } }); // Placeholder
        }
         if (heading === 'Density') {
             // Define and return mockDensitySuccess
            return HttpResponse.json({ Record: { RecordNumber: params.cid, Section: [] } }); // Placeholder
        }
         if (heading === 'GHS Classification') {
            // Define and return mockGhsSuccess
            return HttpResponse.json({ Record: { RecordNumber: params.cid, Section: [] } }); // Placeholder
        }

        // Fallback for unhandled headings in tests
        return HttpResponse.json({ error: `Unhandled heading: ${heading}` }, { status: 404 });
    }),

    // --- Wikidata Mocks ---
    http.get('https://query.wikidata.org/sparql', ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('query');

        // Basic check if query contains a PubChem CID
        const cidMatch = query?.match(/ps:P662 "(\d+)"/);
        const cid = cidMatch ? cidMatch[1] : null;

        if (cid === '2244') { // Aspirin - Example Success Case
            const mockWikidataResponse = {
                head: { vars: ['item', 'itemLabel', 'meltingPoint', 'meltingPointUnit', 'boilingPoint', 'boilingPointUnit', 'density', 'densityUnit', 'densityUnitLabel'] },
                results: {
                    bindings: [
                        { // Melting Point Entry
                            item: { type: 'uri', value: 'http://www.wikidata.org/entity/Q18296' },
                            itemLabel: { 'xml:lang': 'en', type: 'literal', value: 'aspirin' },
                            meltingPoint: { datatype: 'http://www.w3.org/2001/XMLSchema#decimal', type: 'literal', value: '136' },
                            meltingPointUnit: { type: 'uri', value: 'http://www.wikidata.org/entity/Q25267' } // Celsius
                        },
                         { // Boiling Point Entry (example - might be decomposition)
                            item: { type: 'uri', value: 'http://www.wikidata.org/entity/Q18296' },
                            itemLabel: { 'xml:lang': 'en', type: 'literal', value: 'aspirin' },
                            boilingPoint: { datatype: 'http://www.w3.org/2001/XMLSchema#decimal', type: 'literal', value: '140' },
                            boilingPointUnit: { type: 'uri', value: 'http://www.wikidata.org/entity/Q25267' } // Celsius
                        },
                        { // Density Entry
                            item: { type: 'uri', value: 'http://www.wikidata.org/entity/Q18296' },
                            itemLabel: { 'xml:lang': 'en', type: 'literal', value: 'aspirin' },
                            density: { datatype: 'http://www.w3.org/2001/XMLSchema#decimal', type: 'literal', value: '1.4' },
                            densityUnit: { type: 'uri', value: 'http://www.wikidata.org/entity/Q13147228' }, // g/cm³
                             densityUnitLabel: { 'xml:lang': 'en', type: 'literal', value: 'gram per cubic centimetre' }
                        },
                         { // Density Entry (Unknown Unit Example)
                            item: { type: 'uri', value: 'http://www.wikidata.org/entity/Q18296' },
                            itemLabel: { 'xml:lang': 'en', type: 'literal', value: 'aspirin' },
                            density: { datatype: 'http://www.w3.org/2001/XMLSchema#decimal', type: 'literal', value: '1400' },
                            densityUnit: { type: 'uri', value: 'http://www.wikidata.org/entity/QUnknownUnit' }, // Unknown unit
                            densityUnitLabel: { 'xml:lang': 'en', type: 'literal', value: 'kilogram per cubic metre' } // Label for unknown unit
                        }
                    ]
                }
            };
            return HttpResponse.json(mockWikidataResponse);
        } else if (cid === '9999') { // Example: CID found, but no properties
             const mockWikidataEmptyResponse = {
                head: { vars: ['item', 'itemLabel', 'meltingPoint', 'meltingPointUnit', 'boilingPoint', 'boilingPointUnit', 'density', 'densityUnit', 'densityUnitLabel'] },
                results: { bindings: [] } // No bindings found
             };
             return HttpResponse.json(mockWikidataEmptyResponse);
        } else if (cid === 'error') { // Simulate a server error
             return HttpResponse.json({ message: 'SPARQL endpoint error' }, { status: 500 });
        } else { // Default: Not found or other CID
            const mockWikidataNotFoundResponse = {
                 head: { vars: ['item', 'itemLabel', 'meltingPoint', 'meltingPointUnit', 'boilingPoint', 'boilingPointUnit', 'density', 'densityUnit', 'densityUnitLabel'] },
                results: { bindings: [] }
            };
            return HttpResponse.json(mockWikidataNotFoundResponse);
        }
    }),
];
