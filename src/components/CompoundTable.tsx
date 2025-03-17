import { CompoundMap } from '@/common';
import { NumericProperty, Unit } from '@/types/property';
import { ActionIcon, Table } from '@mantine/core';
import { IconExternalLink, IconTrash } from '@tabler/icons-react';
import { TableData } from 'node_modules/@mantine/core/lib';
import React from 'react';

function NumericPropertyList({ properties }: { properties: NumericProperty[] }) {
  const items = properties.map((property) => {
    let text: string;
    if (property.original) {
      text = property.original;
    } else if (property.unit === Unit.GramsPerCubicCentimeter) {
      text = property.value + ' g/cm³';
    } else if (property.unit === Unit.Celsius || property.unit === Unit.Fahrenheit) {
      text = property.value + ' °' + property.unit;
    } else {
      text = property.value;
    }

    return (
      <li key={text}>
        {text}
        <sup>
          &nbsp;[<a href={property.sourceLink}>{property.source}</a>]
        </sup>
      </li>
    );
  });
  return <ul>{items}</ul>;
}

interface CompoundTableProps extends React.HtmlHTMLAttributes<HTMLTableElement> {
  compounds: CompoundMap;
}

export default function CompoundTable({ compounds }: CompoundTableProps) {
  const head: React.ReactNode[] = [
    'Name & Structure',
    'Molecular Weight (g/mol)',
    'Melting Point (°C)',
    'Boiling Point (°C)',
    'Density (g/cm³)',
    'Hazards',
    '', // Column for 'Delete' button
  ];

  const body: React.ReactNode[][] = [];

  for (const compound of compounds.values()) {
    try {
      const nameAndStructure = (
        <>
          <a
            href={'https://pubchem.ncbi.nlm.nih.gov/compound/' + compound.cid}
            className="compound-link"
            style={{ display: 'block' }}
          >
            <div className="name">
              <span>{compound.name}</span>
              <IconExternalLink className="icon-external-link" stroke={3}></IconExternalLink>
            </div>
            <span className="iupac">{compound.iupacName}</span>
          </a>
          <br />
          <a href={compound.structureImageLink}>
            <img
              src={compound.structureImageLink}
              alt={'Skeletal structure for ' + compound.name}
              title={compound.name + ' (click to enlarge)'}
              height="100px"
            />
          </a>
        </>
      );
      const hazards = (
        <ul>
          {compound.properties.hazards.map((h) => (
            <li key={h.code}>
              [{h.code}] {h.hazardStatement}
            </li>
          ))}
        </ul>
      );
      const deleteButton = (
        <ActionIcon
          variant="light"
          color="blue"
          aria-label="Remove row"
          onClick={() => {
            compounds.delete(compound.cid);
          }}
        >
          <IconTrash style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
      );

      body.push([
        nameAndStructure,
        compound.molecularWeight,
        <NumericPropertyList properties={compound.properties.meltingPoint} />,
        <NumericPropertyList properties={compound.properties.boilingPoint} />,
        <NumericPropertyList properties={compound.properties.density} />,
        hazards,
        deleteButton,
      ]);
    } catch (error) {
      console.error('Error processing compound: ', error, '\nCompound: ', JSON.stringify(compound, undefined, 2));
    }
  }

  const data: TableData = {
    head: head,
    body: body,
  };

  return <Table withTableBorder mb="2rem" style={{ textAlign: 'left' }} data={data}></Table>;
}
