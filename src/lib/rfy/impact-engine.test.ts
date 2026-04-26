import { describe, it, expect } from 'vitest';
import {
  computeImpact,
  suphoDiagnosticToResult,
  conversionLossFromCommercial,
} from '@/lib/rfy/impact-engine';

describe('penalidades por degraus', () => {
  it('conversão máxima quando comercial < 40', () => {
    expect(conversionLossFromCommercial(30)).toBe(0.3);
    expect(conversionLossFromCommercial(50)).toBe(0.2);
    expect(conversionLossFromCommercial(80)).toBe(0);
  });
});

describe('computeImpact', () => {
  it('Rc/Pd sobe com pilares altos e G/H=1', () => {
    const r = computeImpact(
      suphoDiagnosticToResult(90, 90, 90),
      { pipelineOpenValue: 1_000_000 },
      {
        governanceScore: 1,
        hygieneScore: 1,
        executionRate: 1,
        /** Sem fricção SUPHO, B=1 deixa Rc=Pd (cenário “ótimo” explícito no teste) */
        baselineReliability: 1,
      }
    );
    expect(r.rfyScore).toBe(1);
    expect(r.revenueInflated).toBe(0);
    expect(r.totalFriction).toBe(0);
  });

  it('aumenta inflada e fricção quando comercial baixo', () => {
    const low = computeImpact(
      suphoDiagnosticToResult(70, 70, 25),
      { pipelineOpenValue: 600_000 },
      { governanceScore: 0.7, hygieneScore: 0.7, executionRate: 0.5 }
    );
    const high = computeImpact(
      suphoDiagnosticToResult(70, 70, 80),
      { pipelineOpenValue: 600_000 },
      { governanceScore: 0.7, hygieneScore: 0.7, executionRate: 0.5 }
    );
    expect(low.revenueInflated).toBeGreaterThan(high.revenueInflated);
    expect(low.totalFriction).toBeGreaterThan(high.totalFriction);
  });

  it('forecast otimizado >= Rc quando executionRate >= 0', () => {
    const r = computeImpact(
      suphoDiagnosticToResult(60, 55, 50),
      { pipelineOpenValue: 400_000 },
      { governanceScore: 0.8, hygieneScore: 0.75, executionRate: 0.6 }
    );
    expect(r.forecastOptimized).toBeGreaterThanOrEqual(r.revenueReliable * 0.99);
  });
});
