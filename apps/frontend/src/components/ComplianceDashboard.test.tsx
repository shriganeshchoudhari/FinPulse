import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ComplianceDashboard from './ComplianceDashboard';

describe('ComplianceDashboard', () => {
  it('renders compliance dashboard and mocked events', () => {
    render(<ComplianceDashboard />);
    
    expect(screen.getByText('Compliance Officer Dashboard')).toBeInTheDocument();
    
    // Check if the mocked rules are rendered
    expect(screen.getByText('AML_CHECK_01')).toBeInTheDocument();
    expect(screen.getByText('Large withdrawal detected')).toBeInTheDocument();
    
    expect(screen.getByText('KYC_EXPIRED')).toBeInTheDocument();
    expect(screen.getByText('User KYC documents expired')).toBeInTheDocument();
    
    expect(screen.getByText('NEW_ACCOUNT')).toBeInTheDocument();
    expect(screen.getByText('New user registered')).toBeInTheDocument();
  });
});
