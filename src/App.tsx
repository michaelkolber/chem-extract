import { Autocomplete, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import React, { useState } from 'react';
import './App.css';

import _ from 'lodash';

import { CompoundProps } from '@/common';
import ClearTableButton from '@/components/ClearTableButton';
import CompoundTable from '@/components/CompoundTable';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useMapWithLocalStorage } from '@/hooks';
import * as pubchem from '@/providers/pubchem/pubchem';
import { Compound } from '@/types/compound';

const LOCALSTORAGE_KEY_TABLE = 'table';

export function Header() {
  const [animating, setAnimating] = useState(false);

  return (
    <header>
      <h1
        id="logo"
        className={animating ? 'animating' : ''}
        onMouseEnter={() => setAnimating(() => true)}
        onAnimationEnd={() => setAnimating(() => false)}
      >
        <a href="https://pubchem.ncbi.nlm.nih.gov/compound/5754">
          <img src="/cortisol.svg" style={{ height: '2em' }} />
        </a>
      </h1>
      <h1>Orgo Table Creator</h1>
    </header>
  );
}

export function MainContent({ compounds }: CompoundProps) {
  if (compounds.size === 0) {
    return null;
  }

  return (
    <div id="main">
      <ErrorBoundary compounds={compounds}>
        <CompoundTable id="table" compounds={compounds} />
      </ErrorBoundary>
      {/* <CopyButton value={document.getElementById('table').outerHTML.trim()}>
          {({ copied, copy }) => (
            <Button color={copied ? 'teal' : 'blue'} onClick={copy}>
              {copied ? 'Copied url' : 'Copy url'}
            </Button>
          )}
        </CopyButton> */}
      <ClearTableButton compounds={compounds} />
    </div>
  );
}

function App() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const compounds = useMapWithLocalStorage<string, Compound>(LOCALSTORAGE_KEY_TABLE);

  const pc = new pubchem.PubChemProvider();

  const onChange = (query: string) => {
    if (query === '') {
      setSuggestions([]);
      return;
    }
    pubchem.PubChemProvider.getSuggestions(query).then((results) => setSuggestions(results));
  };

  const onOptionSubmit = async (name: string) => {
    const compound = new Compound(name, pc);
    await compound.init();
    // Display it in the list while we load the rest of the data
    compounds.set(compound.cid, compound);
    await compound.populate();
    compounds.set(compound.cid, compound);
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
        styles={{
          wrapper: {
            maxWidth: '40em',
            margin: '0 auto 2em',
          },
        }}
      />
      <MainContent compounds={compounds} />
      <div style={{ marginTop: '5rem' }}>
        <sub style={{ color: 'grey' }}>
          for F, with ❤️ |{' '}
          <a
            href="https://github.com/michaelkolber/chem-extract"
            style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 'inherit' }}
          >
            source
          </a>
        </sub>
      </div>
    </MantineProvider>
  );
}

export default App;

// TODO:
// - Button to copy table to clipboard
