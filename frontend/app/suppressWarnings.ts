// Suppress deprecation warnings from dependencies before any other imports
if (typeof window !== 'undefined') {
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  const suppressPatterns = [
    'shadow',
    'pointerEvents',
    'Unauthorized request',
  ];
  
  const shouldSuppress = (args: any[]) => {
    const message = args[0]?.toString?.() || '';
    return suppressPatterns.some(pattern => message.includes(pattern));
  };
  
  console.warn = (...args) => {
    if (!shouldSuppress(args)) {
      originalConsoleWarn.apply(console, args);
    }
  };
  
  console.error = (...args) => {
    if (!shouldSuppress(args)) {
      originalConsoleError.apply(console, args);
    }
  };
}

export {};
