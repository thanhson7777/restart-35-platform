import {
  fetchAndParseFigma,
  extractFileKey,
  getFigmaFile,
  getFigmaNodes,
  getFigmaImages,
  figmaColorToCss,
  figmaEffectToCss,
  figmaTypographyToCss,
  generateReactComponent,
} from '@/lib/figma';

/**
 * ============================================
 * FIGMA API HELPER - USAGE GUIDE
 * ============================================
 *
 * This module provides utilities to fetch and parse
 * Figma designs into React code.
 *
 * SETUP:
 * 1. Add VITE_FIGMA_ACCESS_TOKEN to your .env file
 * 2. Import the functions you need
 *
 */

// ============================================
// EXAMPLE USAGE
// ============================================

/**
 * Example 1: Fetch full Figma file
 *
 * const fileKey = 'abc123XYZ'; // From Figma URL
 * const file = await getFigmaFile(fileKey);
 * console.log(file.document); // Full document tree
 */

/**
 * Example 2: Fetch specific nodes
 *
 * const nodeIds = ['1:2', '1:3']; // Node IDs from Figma
 * const nodes = await getFigmaNodes('abc123XYZ', nodeIds);
 */

/**
 * Example 3: Fetch images from Figma
 *
 * const images = await getFigmaImages(
 *   'abc123XYZ',
 *   ['1:2', '1:3'],
 *   'png',  // format: png, svg, jpg
 *   2       // scale: 0.5, 1, 2, 3, 4
 * );
 * console.log(images.images); // { '1:2': 'https://...', '1:3': 'https://...' }
 */

/**
 * Example 4: Convert Figma URL to React code
 *
 * const result = await fetchAndParseFigma(
 *   'https://www.figma.com/file/abc123XYZ/MyDesign?node-id=1:2'
 * );
 *
 * // Access parsed data
 * console.log(result.parsed);
 */

/**
 * Example 5: Generate React component from node
 *
 * import { parseFigmaNodeToComponent, generateReactComponent } from '@/lib/figma';
 *
 * const file = await getFigmaFile('abc123XYZ');
 * const node = file.document.children[0]; // First frame
 *
 * const parsed = parseFigmaNodeToComponent(node, 'MyComponent');
 * console.log(parsed.styles); // CSS-in-JS styles
 *
 * const code = generateReactComponent(node, 'MyComponent');
 * console.log(code); // React component code
 */

/**
 * Example 6: Convert colors
 *
 * const figmaColor = { r: 0.5, g: 0.2, b: 0.8, a: 1 };
 * const cssColor = figmaColorToCss(figmaColor);
 * console.log(cssColor); // '#8033cc'
 */

// ============================================
// COLOR CONVERSION HELPERS
// ============================================

/**
 * Convert Figma color format to CSS
 * Figma: { r: 0-1, g: 0-1, b: 0-1, a: 0-1 }
 * CSS: #rrggbb or rgba(r, g, b, a)
 */

// ============================================
// STYLE CONVERSION HELPERS
// ============================================

/**
 * Convert Figma effects (shadows) to CSS
 * Supports: DROP_SHADOW, INNER_SHADOW
 */

/**
 * Convert Figma typography to CSS font properties
 */

// ============================================
// QUICK REFERENCE - Figma URL Patterns
// ============================================

/**
 * File URL: https://www.figma.com/file/FILE_KEY/FILE_NAME
 * Node URL: https://www.figma.com/file/FILE_KEY/FILE_NAME?node-id=NODE_ID
 * Multiple nodes: ?node-id=NODE_1,NODE_2
 */

export {
  fetchAndParseFigma,
  extractFileKey,
  getFigmaFile,
  getFigmaNodes,
  getFigmaImages,
  figmaColorToCss,
  figmaEffectToCss,
  figmaTypographyToCss,
  generateReactComponent,
};
