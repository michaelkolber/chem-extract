import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App'; // Adjust path if needed
import * as hooks from './hooks'; // To mock useMapWithLocalStorage
import * as pubchem from './providers/pubchem/pubchem'; // To mock PubChemProvider
import { Compound } from './types/compound'; // To mock Compound class
import '@testing-library/jest-dom';

// --- Mocking Dependencies ---

// Mock Compound Class
const mockCompoundInstance = {
  cid: 12345, // Example CID
  name: 'Mock Compound',
  init: vi.fn().mockResolvedValue(undefined), // Mock init method
  populate: vi.fn().mockResolvedValue(undefined), // Mock populate method
  // Add other properties/methods if App interacts with them directly
};
vi.mock('./types/compound', () => ({
  Compound: vi.fn().mockImplementation(() => mockCompoundInstance),
}));

// Mock PubChemProvider static method
vi.mock('./providers/pubchem/pubchem', async (importOriginal) => {
    const actual = await importOriginal<typeof pubchem>();
    return {
        ...actual, // Keep other exports if any
        PubChemProvider: class { // Mock the class
            // Mock instance methods if needed by App (doesn't seem like it)
            // Mock static methods
            static getSuggestions = vi.fn();
        }
    };
});

// Mock useMapWithLocalStorage Hook
const mockMap = new Map<string | number, any>(); // Use a real map for easier state management in tests
const mockSet = vi.fn((key, value) => {
  mockMap.set(key, value); // Simulate the set operation on our mock map
});
const mockClear = vi.fn(() => {
    mockMap.clear();
});
const mockDelete = vi.fn((key) => {
    mockMap.delete(key);
});
vi.mock('./hooks', async (importOriginal) => {
    const actual = await importOriginal<typeof hooks>();
    return {
        ...actual, // Keep other exports if any
        useMapWithLocalStorage: vi.fn(() => {
            // Return the Map interface: set, clear, delete, and the map itself for iteration/size
            // Note: The hook itself returns the Map instance, so we need to replicate that.
            // We return our mockMap which also has the mocked methods attached.
             mockMap.set = mockSet;
             mockMap.clear = mockClear;
             mockMap.delete = mockDelete;
             return mockMap;
        }),
    };
});


// --- Test Suite ---
describe('App Component Integration Tests', () => {

  beforeEach(() => {
    // Reset mocks and the mock map state before each test
    vi.clearAllMocks();
    mockMap.clear(); // Clear the map state

     // Re-apply mocks to the map instance for the next test
     mockMap.set = mockSet;
     mockMap.clear = mockClear;
     mockMap.delete = mockDelete;

    // Reset mock implementations if needed (e.g., return values)
    (pubchem.PubChemProvider.getSuggestions as vi.Mock).mockResolvedValue([]);
    (Compound as vi.Mock).mockImplementation(() => mockCompoundInstance); // Reset to default mock instance
    mockCompoundInstance.init.mockResolvedValue(undefined);
    mockCompoundInstance.populate.mockResolvedValue(undefined);
  });

  it('should render initial state correctly', () => {
    render(<App />);
    // Check for Header elements
    expect(screen.getByRole('heading', { name: /orgo table creator/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cortisol logo/i })).toBeInTheDocument(); // Assuming img has alt/aria-label

    // Check for Autocomplete input
    expect(screen.getByPlaceholderText(/search for any compound/i)).toBeInTheDocument();

    // Check that MainContent (and thus CompoundTable) is initially not rendered or empty
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear table/i})).not.toBeInTheDocument();

  });

  it('should fetch and display suggestions on autocomplete change', async () => {
    const mockSuggestions = ['Aspirin', 'Ibuprofen'];
    (pubchem.PubChemProvider.getSuggestions as vi.Mock).mockResolvedValue(mockSuggestions);

    render(<App />);
    const input = screen.getByPlaceholderText(/search for any compound/i);

    // Act: Type into the input
    fireEvent.change(input, { target: { value: 'asp' } });

    // Assert: Wait for suggestions to appear (due to debounce and async fetch)
    // Need to find the suggestions list - Mantine might render it in a portal
    // Often easier to find by the text content of the options
    await waitFor(() => {
       expect(pubchem.PubChemProvider.getSuggestions).toHaveBeenCalledWith('asp');
    });

    // Check if suggestions are rendered (assuming Mantine renders them as buttons or similar role)
    // This might depend heavily on Mantine's internal structure for Autocomplete
    // Let's check if the text is present in the document as a fallback
    await waitFor(() => {
        expect(screen.getByText('Aspirin')).toBeInTheDocument();
        expect(screen.getByText('Ibuprofen')).toBeInTheDocument();
    });

  });

  it('should add compound to state and table on suggestion submit', async () => {
     const suggestionToSubmit = 'Aspirin';
     // Mock suggestions fetch needed to trigger the dropdown
     (pubchem.PubChemProvider.getSuggestions as vi.Mock).mockResolvedValue([suggestionToSubmit]);
     // Configure mock Compound instance details for this test if needed
     mockCompoundInstance.name = suggestionToSubmit;
     mockCompoundInstance.cid = 2244; // Aspirin's CID

     render(<App />);
     const input = screen.getByPlaceholderText(/search for any compound/i);

     // Act 1: Type and wait for suggestion
     fireEvent.change(input, { target: { value: 'asp' } });
     const suggestionOption = await screen.findByText(suggestionToSubmit);

     // Act 2: Click the suggestion
     fireEvent.click(suggestionOption);

     // Assert: Check mocks were called
     await waitFor(() => {
        expect(Compound).toHaveBeenCalledWith(suggestionToSubmit, expect.any(pubchem.PubChemProvider), expect.anything()); // Check constructor args
        expect(mockCompoundInstance.init).toHaveBeenCalledOnce();
     });

     // init() must complete before the first set call
     await waitFor(() => {
         expect(mockSet).toHaveBeenCalled();
     });

      // Check that populate is called after the first set
     await waitFor(() => {
        expect(mockCompoundInstance.populate).toHaveBeenCalledOnce();
     });

     // Check that set is called again after populate
      await waitFor(() => {
          // The exact number depends on whether populate triggers a state update that App listens to
          // Based on App.tsx, it calls set twice explicitly.
         expect(mockSet).toHaveBeenCalledTimes(2);
         // Check the arguments of the set calls
         expect(mockSet).toHaveBeenCalledWith(mockCompoundInstance.cid, mockCompoundInstance);
     });


     // Assert: Check if the table now renders the compound
     // Wait for the table and the row corresponding to the added compound
     await waitFor(() => {
         const table = screen.getByRole('table');
         expect(table).toBeInTheDocument();
         // Use the mock compound name/data to find the row
         const row = within(table).getByText(suggestionToSubmit); // Find cell containing the name
         expect(row).toBeInTheDocument();
         // Can add more assertions about the row content if needed
     });

      // Check Clear button is also rendered now
      expect(screen.getByRole('button', { name: /clear table/i })).toBeInTheDocument();
  });

});
