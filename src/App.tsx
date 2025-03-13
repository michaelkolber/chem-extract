import React from 'react';
import { useState } from 'react'
import './App.css'

import '@mantine/core/styles.css';
import { MantineProvider, Autocomplete, Table, Space, ActionIcon, Button, CopyButton, TableData } from '@mantine/core';
import { useLocalStorage, useMap } from '@mantine/hooks';
import { IconEraser, IconExternalLink, IconTrash } from '@tabler/icons-react';

import _ from 'lodash';

import * as pubchem from '@/providers/pubchem';

const LOCALSTORAGE_KEY_TABLE = 'table';

function Header() {
  return (
    <header>
      <h1>
        <a href="https://pubchem.ncbi.nlm.nih.gov/compound/5754">
          <img src="/cortisol.svg" style={{ height: '2em' }} />
        </a>
      </h1>
      <h1>Orgo Table Creator</h1>
    </header>
  );
}

function CompoundTable({ data }: { data: TableData }) {
  if (data.body.length === 0) {
    return null;
  }
  return (
    <Table
      id="table"
      withTableBorder
      mb="2rem"
      style={{ textAlign: 'left' }}
      data={data}
    >
    </Table>
  );
}

function App() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [storedCompounds, setStoredCompounds] = useLocalStorage<Map<string, pubchem.Compound>>({
    key: LOCALSTORAGE_KEY_TABLE,
    serialize: (value) => {
      return JSON.stringify(Array.from(value.entries()))
    },
    deserialize: (localStorageValue) => {
      let stored = localStorageValue ? JSON.parse(localStorageValue) : [];
      return new Map<string, pubchem.Compound>(stored)
    },
    defaultValue: new Map<string, pubchem.Compound>(),
    // Immediately populate storedCompounds, see https://help.mantine.dev/q/local-storage-effect
    getInitialValueInEffect: false,
  });
  const compounds = useMap<string, pubchem.Compound>(storedCompounds);

  const onChange = (query: string) => {
    if (query === '') {
      setSuggestions([]);
      return;
    }
    pubchem.getSuggestions(query).then(compounds => setSuggestions(compounds));
  }

  const onOptionSubmit = async (name: string) => {
    const compound = await pubchem.getCompound(name);
    if (compounds.has(compound.cid)) {
      return;
    }
    compound.lookupName = name;
    // Display it in the list while we load the rest of the data
    compounds.set(compound.cid, compound);
    await compound.update()
    compounds.set(compound.cid, compound);
    setStoredCompounds(compounds);
  }

  const data: TableData = {
    head: [
      'Name',
      'Structure',
      'Molecular Weight (g/mol)',
      'Melting Point (°C)',
      'Boiling Point (°C)',
      'Density (g/cm³)',
      'Hazards',
      '',  // Column for 'Delete' button
    ],
    body: Array.from(compounds.values(), (compound) => {
      let row = [
        (
          <a href={'https://pubchem.ncbi.nlm.nih.gov/compound/' + compound.cid} className='compound-link' style={{ display: 'block' }}>
            <div className='name'>
              <span>{compound.lookupName}</span>
              <IconExternalLink className='icon-external-link' stroke={3}></IconExternalLink>
            </div>
            <span className='iupac'>{compound.name}</span>
          </a>
        ),
        (<a href={compound.structureLink}><img src={compound.structureLink} height="100px" /></a>),
        compound.molecularWeight,
      ];
      row = row.concat([compound.meltingPoint, compound.boilingPoint, compound.density, compound.hazard].map((property) => {
        if (property.length <= 1) {
          return property[0];
        }
        return (
          <ul>
            {property.map((value, index) => (<li>{value}</li>))}
          </ul>
        )
      }));
      row.push(
        <ActionIcon variant="light" color='blue' aria-label="Remove row" onClick={() => { compounds.delete(compound.cid); setStoredCompounds(compounds) }}>
          <IconTrash style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
      );

      return row;
    }),
  };

  return (
    <MantineProvider>
      <Header />
      <Autocomplete
        autoFocus={true}
        placeholder="Search for any compound"
        data={suggestions}
        onChange={_.debounce(onChange, 500)}
        filter={({ options }) => options}
        onOptionSubmit={onOptionSubmit}
        mb="2rem"
      />
      <CompoundTable data={data} />
      <div>
        {/* <CopyButton value={document.getElementById('table').outerHTML.trim()}>
          {({ copied, copy }) => (
            <Button color={copied ? 'teal' : 'blue'} onClick={copy}>
              {copied ? 'Copied url' : 'Copy url'}
            </Button>
          )}
        </CopyButton> */}
        <Button
          variant="filled"
          color="red"
          leftSection={<IconEraser stroke={1.5} />}
          onClick={() => {
            if (confirm('Are you sure you want to clear the entire table?')) {
              compounds.clear();
              setStoredCompounds(compounds);
            }
          }}>
          Clear Table
        </Button>
      </div>

      <div style={{ marginTop: '5rem' }}>
        <sub style={{ color: 'grey' }}>
          for F, with ❤️ | <a href="https://github.com/michaelkolber/chem-extract" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 'inherit' }}>source</a>
        </sub>
      </div>
    </MantineProvider>
  )
}

export default App


// TODO:
// - Button to copy table to clipboard