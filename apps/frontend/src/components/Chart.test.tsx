import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Chart } from './Chart';

// Mock ResizeObserver for Recharts
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

describe('Chart', () => {
  it('renders the chart heading', () => {
    render(<Chart />);
    expect(screen.getByText('BTC/USD Price Chart')).toBeInTheDocument();
  });
});
