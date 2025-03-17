import { CompoundMap, CompoundProps } from '@/common';
import ClearTableButton from '@/components/ClearTableButton';
import { Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import React from 'react';

interface Props extends CompoundProps {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  compounds: CompoundMap;

  constructor(props: Props) {
    super(props);
    this.compounds = props.compounds;
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(
      error,
      // Example "componentStack":
      //   in ComponentThatThrows (created by App)
      //   in ErrorBoundary (created by App)
      //   in div (created by App)
      //   in App
      info.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      return <ErrorModal compounds={this.compounds} />;
    }

    return this.props.children;
  }
}

function ErrorModal({ compounds }: CompoundProps) {
  const [opened, { open, close }] = useDisclosure(true);
  return (
    <Modal
      opened={opened}
      onClose={close}
      centered
      withCloseButton={false}
      closeOnEscape={false}
      closeOnClickOutside={false}
      
    >
      <p>An error was detected in your stored data (sorry!). Please clear the table to continue.</p>
      <div style={{ textAlign: 'center', margin: '2em 0 1em 0' }}>
        <ClearTableButton compounds={compounds} onConfirm={close} />
      </div>
    </Modal>
  );
}
