import { CompoundProps } from '@/common';
import { Button } from '@mantine/core';
import { IconEraser } from '@tabler/icons-react';
import React from 'react';

interface Props extends CompoundProps {
  onConfirm?: () => void;
}

export default function ClearTableButton({ compounds, onConfirm }: Props) {
  return (
    <Button
      variant="filled"
      color="red"
      leftSection={<IconEraser stroke={1.5} />}
      onClick={() => {
        if (confirm('Are you sure you want to clear the entire table?')) {
          compounds.clear();
          if (onConfirm !== undefined) {
            onConfirm();
          }
        }
      }}
    >
      Clear Table
    </Button>
  );
}
