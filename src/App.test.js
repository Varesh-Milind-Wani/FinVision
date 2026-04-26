import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@ionic/react', () => ({
  IonApp: ({ children }) => <div data-testid="ion-app">{children}</div>,
}));

// Import after mocks (avoids Jest parsing ESM-only Ionic bundles)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const App = require('./App').default;

test('renders the app header', () => {
  render(<App />);
  expect(screen.getByAltText('FinVision')).toBeInTheDocument();
});
