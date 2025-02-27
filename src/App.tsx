import React from 'react';
import { useState } from 'react'
import './App.css'

import '@mantine/core/styles.css';
import { MantineProvider, Autocomplete, Table, Space } from '@mantine/core';
import { useMap } from '@mantine/hooks';

import _ from 'lodash';

import * as pubchem from './providers/pubchem';
import { Compound } from './providers/pubchem';

function App() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const compounds = useMap<string, Compound>();

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
  }

  return (
    <MantineProvider>
      <h1>Orgo Table Creator</h1>
      <p>Made for Faigy with &lt;3</p>
      <Autocomplete
        autoFocus={true}
        placeholder="Search for any compound"
        data={suggestions}
        onChange={_.debounce(onChange, 500)}
        filter={({ options }) => options}
        onOptionSubmit={onOptionSubmit}
      />
      <Space h="xl" />
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Structure</Table.Th>
            <Table.Th>Molecular Weight (g/mol)</Table.Th>
            <Table.Th>Melting Point (&deg;C)</Table.Th>
            <Table.Th>Boiling Point (&deg;C)</Table.Th>
            <Table.Th>Density (g/cm&sup3;)</Table.Th>
            <Table.Th>Hazards</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody align="left">{
          Array.from(compounds.values()).map((compound) => (
            <Table.Tr key={compound.cid}>
              <Table.Td><a href={'https://pubchem.ncbi.nlm.nih.gov/compound/' + compound.cid} target="_blank">{compound.name}</a></Table.Td>
              <Table.Td><img src={compound.structureLink} height="100px" /></Table.Td>
              <Table.Td>{compound.molecularWeight}</Table.Td>
              <Table.Td>
                <ul>
                  {
                    compound.meltingPoint.map((hazard) => (
                      <li key={hazard}>{hazard}</li>
                    ))
                  }
                </ul>
              </Table.Td>
              <Table.Td>
                <ul>
                  {
                    compound.boilingPoint.map((hazard) => (
                      <li key={hazard}>{hazard}</li>
                    ))
                  }
                </ul>
              </Table.Td>
              <Table.Td>
                <ul>
                  {
                    compound.density.map((val) => (
                      <li key={val}>{val}</li>
                    ))
                  }
                </ul>
              </Table.Td>
              <Table.Td>
                <ul>
                  {
                    compound.hazard.map((val) => (
                      <li key={val}>{val}</li>
                    ))
                  }
                </ul>
              </Table.Td>
            </Table.Tr>
          ))
        }</Table.Tbody>
      </Table>
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
    </MantineProvider>
  )
}

export default App


// TODO:
// - Save across reloads
// - Button to copy table to clipboard
// - Button to remove item