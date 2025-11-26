import { vi } from 'vitest';

vi.mock('../../src/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };

  return {
    getCycfixLogger: vi.fn(() => mockLogger),
  };
});
