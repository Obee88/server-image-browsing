import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the URL input and the apply button', () => {
  render(<App />);
  expect(screen.getByLabelText(/page url/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
});
