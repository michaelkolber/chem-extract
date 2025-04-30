import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import CompoundTable from './CompoundTable'; // Adjust path if needed
import { Compound, CompoundMap } from '@/common'; // Adjust path for common types
import { NumericProperty, Hazard, Unit } from '@/types/property'; // Adjust path for property types
import '@testing-library/jest-dom';

// Helper function to create mock compounds
const createMockCompound = (cid: number, name: string, overrides: Partial<Compound> = {}): Compound => ({
  cid: cid,
  name: name,
  iupacName: `${name} IUPAC Name`,
  molecularWeight: (100 + cid).toString(), // Example MW
  structureImageLink: `http://example.com/structure/${cid}.png`,
  properties: {
    meltingPoint: undefined, // Default to loading
    boilingPoint: undefined,
    density: undefined,
    hazards: undefined,
  },
  // Allow overriding any property
  ...overrides,
  // Ensure properties object exists even if overridden
  properties: {
    meltingPoint: undefined,
    boilingPoint: undefined,
    density: undefined,
    hazards: undefined,
    ...(overrides.properties || {}), // Merge provided properties
  },
});

describe('CompoundTable Component', () => {
  let mockCompounds: CompoundMap;
  let mockDeleteFn = vi.fn();

  beforeEach(() => {
    // Reset map and mock function before each test
    mockDeleteFn.mockClear();
    mockCompounds = new Map<number, Compound>();
    // Add the delete spy to the mock map instance
    mockCompounds.delete = mockDeleteFn;
  });

  it('should render an empty table body when compounds map is empty', () => {
    render(<CompoundTable compounds={mockCompounds} />);
    const table = screen.getByRole('table');
    const tbody = within(table).getByRole('rowgroup'); // Mantine renders tbody as rowgroup
    expect(tbody).toBeInTheDocument();
    const rows = within(tbody).queryAllByRole('row');
    expect(rows).toHaveLength(0);
  });

  it('should render compound name, IUPAC name, and molecular weight correctly', () => {
    const compound1 = createMockCompound(101, 'Compound A');
    mockCompounds.set(compound1.cid, compound1);

    render(<CompoundTable compounds={mockCompounds} />);
    const row = screen.getByRole('row', { name: /compound a/i }); // Find row by accessible name (img alt?) or content

    // Check Name/Structure cell
    const cell1 = within(row).getAllByRole('cell')[0];
    expect(within(cell1).getByText('Compound A')).toBeInTheDocument();
    expect(within(cell1).getByText('Compound A IUPAC Name')).toBeInTheDocument();
    expect(within(cell1).getByRole('img', { name: /skeletal structure for compound a/i })).toHaveAttribute('src', compound1.structureImageLink);

    // Check Molecular Weight cell
    const cell2 = within(row).getAllByRole('cell')[1];
    expect(cell2).toHaveTextContent(`${compound1.molecularWeight} g/mol`);
  });

  it('should render loaded numeric properties using NumericPropertyList', () => {
     const meltingPointData: NumericProperty[] = [{ value: '100', unit: Unit.Celsius, source: 'Test', sourceLink: '#' }];
     const compound1 = createMockCompound(102, 'Compound B', {
        properties: { meltingPoint: meltingPointData }
     });
     mockCompounds.set(compound1.cid, compound1);

     render(<CompoundTable compounds={mockCompounds} />);
     const row = screen.getByRole('row', { name: /compound b/i });
     const meltingPointCell = within(row).getAllByRole('cell')[2]; // Melting point is the 3rd cell (index 2)

     // Check for the formatted text from NumericPropertyList
     expect(meltingPointCell).toHaveTextContent('100 °C');
     // Check for the source link
     expect(within(meltingPointCell).getByRole('link', { name: 'Test' })).toHaveAttribute('href', '#');
     // Ensure skeleton is NOT present
     expect(within(meltingPointCell).queryByRole('progressbar')).not.toBeInTheDocument(); // Skeletons might have progressbar role
     expect(meltingPointCell).not.toHaveTextContent('?');
  });

   it('should render "?" for missing numeric properties (empty array)', () => {
     const compound1 = createMockCompound(103, 'Compound C', {
        properties: { density: [] } // Empty array signifies missing data after fetch
     });
     mockCompounds.set(compound1.cid, compound1);

     render(<CompoundTable compounds={mockCompounds} />);
     const row = screen.getByRole('row', { name: /compound c/i });
     const densityCell = within(row).getAllByRole('cell')[4]; // Density is the 5th cell (index 4)

     expect(densityCell).toHaveTextContent('?');
      // Ensure skeleton is NOT present
     expect(within(densityCell).queryByRole('progressbar')).not.toBeInTheDocument();
   });

   it('should render skeletons for loading properties (undefined)', () => {
     const compound1 = createMockCompound(104, 'Compound D', {
        properties: { boilingPoint: undefined } // Undefined signifies loading
     });
     mockCompounds.set(compound1.cid, compound1);

     render(<CompoundTable compounds={mockCompounds} />);
     const row = screen.getByRole('row', { name: /compound d/i });
     const boilingPointCell = within(row).getAllByRole('cell')[3]; // Boiling point is the 4th cell (index 3)

     // Check for presence of skeleton elements (checking by class might be more reliable)
     const skeletons = boilingPointCell.querySelectorAll('.skeleton'); // Using the class from the component code
     expect(skeletons.length).toBeGreaterThan(0);

     // Ensure '?' or specific loaded data is NOT present
     expect(boilingPointCell).not.toHaveTextContent('?');
     expect(boilingPointCell).not.toHaveTextContent('°C'); // Assuming loaded data would have units
   });

    it('should render loaded hazards correctly', () => {
     const hazardData: Hazard[] = [{ code: 'H300', hazardStatement: 'Fatal if swallowed', pictogram: 'Skull' }];
     const compound1 = createMockCompound(105, 'Compound E', {
        properties: { hazards: hazardData }
     });
     mockCompounds.set(compound1.cid, compound1);

     render(<CompoundTable compounds={mockCompounds} />);
     const row = screen.getByRole('row', { name: /compound e/i });
     const hazardsCell = within(row).getAllByRole('cell')[5]; // Hazards is the 6th cell (index 5)

     // Check for list item text
     expect(within(hazardsCell).getByText(/\[H300\] Fatal if swallowed/)).toBeInTheDocument();
     // Ensure skeleton is NOT present
     expect(hazardsCell.querySelectorAll('.skeleton').length).toBe(0);
   });

    it('should render skeleton for loading hazards (undefined)', () => {
     const compound1 = createMockCompound(106, 'Compound F', {
        properties: { hazards: undefined } // Undefined signifies loading
     });
     mockCompounds.set(compound1.cid, compound1);

     render(<CompoundTable compounds={mockCompounds} />);
     const row = screen.getByRole('row', { name: /compound f/i });
     const hazardsCell = within(row).getAllByRole('cell')[5];

     // Check for presence of skeleton elements
     const skeletons = hazardsCell.querySelectorAll('.skeleton');
     expect(skeletons.length).toBeGreaterThan(0);
   });


  it('should call compounds.delete with the correct CID when delete button is clicked', () => {
    const compound1 = createMockCompound(107, 'Compound G');
    mockCompounds.set(compound1.cid, compound1);

    render(<CompoundTable compounds={mockCompounds} />);
    const row = screen.getByRole('row', { name: /compound g/i });
    const deleteButtonCell = within(row).getAllByRole('cell')[6]; // Delete button is the last cell (index 6)
    const deleteButton = within(deleteButtonCell).getByRole('button', { name: /remove row/i });

    // Act
    fireEvent.click(deleteButton);

    // Assert
    expect(mockDeleteFn).toHaveBeenCalledOnce();
    expect(mockDeleteFn).toHaveBeenCalledWith(compound1.cid); // Verify it's called with the correct key
  });

});
