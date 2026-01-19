/**
 * Multi-User AR Example
 *
 * This example demonstrates how to build collaborative AR experiences
 * using Hololand's AR packages for shared spatial computing.
 *
 * Coming soon - see the other examples for complete demos.
 */

import { createLogger } from "@hololand/logger";

const logger = createLogger("multi-user-ar");

logger.info("Multi-User AR Example - Coming Soon");
logger.info("Check out examples/07-hybrid-world for a complete AR demo");

document.body.innerHTML = `
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white;">
    <h1>🔮 Multi-User AR</h1>
    <p>Collaborative AR Experience - Coming Soon</p>
    <p style="opacity: 0.7; margin-top: 2rem;">
      See <a href="../07-hybrid-world" style="color: #00d4ff;">07-hybrid-world</a> for a complete AR demo
    </p>
  </div>
`;
