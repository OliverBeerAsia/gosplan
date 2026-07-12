'use strict';

// Pixi's browser adapter probes navigator during module initialization. Node 24
// provides it, but the Node 20 CI runtime does not. Install the smallest
// deterministic test-only shim before a validator imports Pixi or a renderer.
if (!global.navigator) {
  Object.defineProperty(global, 'navigator', {
    value: { platform: 'node', userAgent: 'node.js' },
    configurable: true,
  });
}
