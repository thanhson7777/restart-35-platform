import axios from 'axios';

const FIGMA_API_BASE = 'https://api.figma.com/v1';
const FIGMA_ACCESS_TOKEN = import.meta.env.VITE_FIGMA_ACCESS_TOKEN || import.meta.env.FIGMA_ACCESS_TOKEN;

const figmaApi = axios.create({
  baseURL: FIGMA_API_BASE,
  headers: {
    'X-Figma-Token': FIGMA_ACCESS_TOKEN,
  },
});

/**
 * Extract file key from Figma URL
 * URL format: https://www.figma.com/file/FILE_KEY/FILE_NAME?node-id=NODE_ID
 */
export function extractFileKey(figmaUrl) {
  const match = figmaUrl.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Extract node IDs from Figma URL
 * Returns array of node IDs
 */
export function extractNodeIds(figmaUrl) {
  const match = figmaUrl.match(/node-id=([^&]+)/);
  if (match) {
    return match[1].split(',').map(id => decodeURIComponent(id));
  }
  return [];
}

/**
 * Get full file data from Figma
 */
export async function getFigmaFile(fileKey) {
  try {
    const response = await figmaApi.get(`/files/${fileKey}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Figma file:', error);
    throw error;
  }
}

/**
 * Get specific nodes from Figma file
 */
export async function getFigmaNodes(fileKey, nodeIds) {
  try {
    const nodeString = nodeIds.join(',');
    const response = await figmaApi.get(`/files/${fileKey}/nodes?ids=${nodeString}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Figma nodes:', error);
    throw error;
  }
}

/**
 * Get file images (export nodes as images)
 */
export async function getFigmaImages(fileKey, nodeIds, format = 'png', scale = 2) {
  try {
    const ids = nodeIds.join(',');
    const response = await figmaApi.get(`/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Figma images:', error);
    throw error;
  }
}

/**
 * Get styles from Figma file
 */
export async function getFigmaStyles(fileKey) {
  try {
    const response = await figmaApi.get(`/files/${fileKey}`);
    const styles = {};

    // Extract styles from components
    const components = response.data.components || {};
    const componentSets = response.data.componentSets || {};

    Object.entries(components).forEach(([key, component]) => {
      styles[key] = {
        name: component.name,
        description: component.description,
      };
    });

    return { styles, components, componentSets };
  } catch (error) {
    console.error('Error fetching Figma styles:', error);
    throw error;
  }
}

/**
 * Convert Figma color to CSS color
 */
export function figmaColorToCss(color) {
  if (!color) return 'transparent';

  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  const a = color.a !== undefined ? color.a : 1;

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // Convert to hex
  const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  return hex;
}

/**
 * Convert Figma effect to CSS shadow
 */
export function figmaEffectToCss(effect) {
  if (!effect || effect.type !== 'DROP_SHADOW') return 'none';

  const { offset, radius, color } = effect;
  const x = offset?.x || 0;
  const y = offset?.y || 0;
  const blur = radius || 0;
  const cssColor = figmaColorToCss(color);

  return `${x}px ${y}px ${blur}px ${cssColor}`;
}

/**
 * Convert Figma typography to CSS
 */
export function figmaTypographyToCss(style) {
  const css = {};

  if (style.fontFamily) css.fontFamily = `'${style.fontFamily}', sans-serif`;
  if (style.fontSize) css.fontSize = `${style.fontSize}px`;
  if (style.fontWeight) css.fontWeight = style.fontWeight;
  if (style.letterSpacing) css.letterSpacing = `${style.letterSpacing}px`;
  if (style.lineHeightPx) css.lineHeight = `${style.lineHeightPx}px`;
  if (style.textDecoration) css.textDecoration = style.textDecoration;

  return css;
}

/**
 * Parse Figma frame/component to React component code
 */
export function parseFigmaNodeToComponent(node, name = 'FigmaComponent') {
  const styles = {};
  const children = [];

  // Extract layout properties
  if (node.absoluteBoundingBox) {
    styles.width = `${node.absoluteBoundingBox.width}px`;
    styles.height = `${node.absoluteBoundingBox.height}px`;
    styles.position = 'absolute';
    styles.left = `${node.absoluteBoundingBox.x}px`;
    styles.top = `${node.absoluteBoundingBox.y}px`;
  }

  // Extract fills (background color)
  if (node.fills && node.fills.length > 0) {
    const fill = node.fills.find(f => f.visible !== false && f.type === 'SOLID');
    if (fill) {
      styles.backgroundColor = figmaColorToCss(fill.color);
    }
  }

  // Extract strokes (borders)
  if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes.find(s => s.visible !== false);
    if (stroke) {
      styles.borderColor = figmaColorToCss(stroke.color);
      styles.borderWidth = `${node.strokeWeight || 1}px`;
    }
  }

  // Extract effects (shadows)
  if (node.effects && node.effects.length > 0) {
    const shadow = node.effects.find(e => e.visible !== false);
    if (shadow) {
      styles.boxShadow = figmaEffectToCss(shadow);
    }
  }

  // Extract corner radius
  if (node.cornerRadius) {
    styles.borderRadius = `${node.cornerRadius}px`;
  }

  // Extract name
  const componentName = node.name
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[0-9]/, 'n')
    || name;

  return {
    name: componentName,
    styles,
    type: node.type,
    children,
  };
}

/**
 * Generate React component code from Figma node
 */
export function generateReactComponent(node, name) {
  const parsed = parseFigmaNodeToComponent(node, name);

  const styleString = Object.entries(parsed.styles)
    .map(([key, value]) => {
      const cssKey = key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
      return `  ${cssKey}: '${value}'`;
    })
    .join(',\n');

  return `const ${parsed.name} = () => {
  return (
    <div
      style={{
${styleString}
      }}
    >
      {/* Add children here */}
    </div>
  );
};

export default ${parsed.name};
`;
}

/**
 * Main function to fetch and parse Figma design
 */
export async function fetchAndParseFigma(figmaUrl) {
  const fileKey = extractFileKey(figmaUrl);

  if (!fileKey) {
    throw new Error('Invalid Figma URL. Please provide a valid Figma file URL.');
  }

  const nodeIds = extractNodeIds(figmaUrl);

  if (nodeIds.length > 0) {
    const response = await getFigmaNodes(fileKey, nodeIds);
    return {
      type: 'nodes',
      data: response.data,
      parsed: Object.fromEntries(
        Object.entries(response.data.nodes).map(([id, node]) => [
          id,
          parseFigmaNodeToComponent(node.document),
        ])
      ),
    };
  }

  const file = await getFigmaFile(fileKey);
  return {
    type: 'file',
    data: file,
    document: file.document,
    components: file.components,
  };
}

export default {
  extractFileKey,
  extractNodeIds,
  getFigmaFile,
  getFigmaNodes,
  getFigmaImages,
  getFigmaStyles,
  figmaColorToCss,
  figmaEffectToCss,
  figmaTypographyToCss,
  parseFigmaNodeToComponent,
  generateReactComponent,
  fetchAndParseFigma,
};
