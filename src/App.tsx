import React from 'react';
import { useState } from 'react'
import './App.css'

import '@mantine/core/styles.css';
import { MantineProvider, Autocomplete, Table, Space, ActionIcon, Button, CopyButton } from '@mantine/core';
import { useLocalStorage, useMap } from '@mantine/hooks';
import { IconEraser, IconTrash } from '@tabler/icons-react';

import _ from 'lodash';

import * as pubchem from '@/providers/pubchem';

const LOCALSTORAGE_KEY_TABLE = 'table';

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
    // Display it in the list while we load the rest of the data
    compounds.set(compound.cid, compound);
    await compound.update()
    compounds.set(compound.cid, compound);
    setStoredCompounds(compounds);
  }

  return (
    <MantineProvider>
      <h1>
        <a href="https://pubchem.ncbi.nlm.nih.gov/compound/5754">
          <img src="/cortisol.svg" style={{ height: '2em' }} />
        </a>
      </h1>
      <h1>Orgo Table Creator</h1>
      <Autocomplete
        autoFocus={true}
        placeholder="Search for any compound"
        data={suggestions}
        onChange={_.debounce(onChange, 500)}
        filter={({ options }) => options}
        onOptionSubmit={onOptionSubmit}
      />
      {
        compounds.size !== 0 && (
          <>
            <Space h="xl" />
            <Table id="table">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Structure</Table.Th>
                  <Table.Th>Molecular Weight (g/mol)</Table.Th>
                  <Table.Th>Melting Point (&deg;C)</Table.Th>
                  <Table.Th>Boiling Point (&deg;C)</Table.Th>
                  <Table.Th>Density (g/cm&sup3;)</Table.Th>
                  <Table.Th>Hazards</Table.Th>
                  <Table.Th>{/* 'Delete' row */}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody style={{ textAlign: 'left' }}>
                {
                  Array.from(compounds.values()).map((compound) => (
                    <Table.Tr key={compound.cid}>
                      <Table.Td><a href={'https://pubchem.ncbi.nlm.nih.gov/compound/' + compound.cid}>{compound.name}</a></Table.Td>
                      <Table.Td><img src={compound.structureLink} height="100px" /></Table.Td>
                      <Table.Td>{compound.molecularWeight}</Table.Td>
                      {
                        [compound.meltingPoint, compound.boilingPoint, compound.density].map((property) => (
                          <Table.Td>
                            {property.length <= 1 ? property[0] : (
                              <ul>
                                {
                                  property.map((value, index) => (
                                    <li key={index}>{value}</li>
                                  ))
                                }
                              </ul>
                            )}
                          </Table.Td>
                        ))
                      }
                      <Table.Td>
                        {compound.hazard.length <= 1 ? compound.hazard[0] : (
                          <ul>
                            <li key={0}>{compound.hazard[0]}</li>
                            {
                              compound.hazard.slice(1).map((value, index) => (
                                <li key={index + 1}>{value}</li>
                              ))
                            }
                          </ul>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon variant="light" color='blue' aria-label="Remove row" onClick={() => { compounds.delete(compound.cid); setStoredCompounds(compounds) }}>
                          <IconTrash style={{ width: '70%', height: '70%' }} stroke={1.5} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))
                }
              </Table.Tbody>
            </Table>
            <Space h="xl" />
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
          </>
        )}
      {/* <div className="card">
        <button onClick={() => compounds.set('1', new Compound('1', 'Water', '18.01528'))}>
          Add Water
        </button>
        <button onClick={() => {
          let a = compounds.get('1')!
          a.boilingPoint = '5'
          compounds.set('1', a)
        }}>
          Update Water
        </button>
      </div> */}

      <div style={{ marginTop: '5em' }}>
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