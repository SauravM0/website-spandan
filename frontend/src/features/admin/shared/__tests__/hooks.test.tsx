import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLatestRequest } from '../hooks';

describe('admin request coordination', () => {
  it('never lets an older response overwrite a newer response', async () => {
    const resolvers: Array<(value: string) => void> = [];
    function Example() {
      const [value, setValue] = useState('none');
      const runLatest = useLatestRequest();
      const load = () =>
        void runLatest(() => new Promise<string>((resolve) => resolvers.push(resolve))).then(
          (result) => {
            if (result) setValue(result);
          }
        );
      return <button onClick={load}>{value}</button>;
    }
    render(<Example />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    resolvers[1]('new response');
    await screen.findByText('new response');
    resolvers[0]('old response');
    await Promise.resolve();
    expect(button).toHaveTextContent('new response');
  });
});
