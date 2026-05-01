# Figma to Code Skill

## Mục đích
Cho phép người dùng fetch và parse thiết kế từ Figma API, chuyển đổi thành React code.

## Cách sử dụng

### Lệnh: `/figma-use <figma_url>`

### Input
- `figma_url`: URL của Figma file hoặc node cụ thể

### Ví dụ URL Figma
```
https://www.figma.com/file/FILE_KEY/FILE_NAME
https://www.figma.com/file/FILE_KEY/FILE_NAME?node-id=1:2
https://www.figma.com/file/FILE_KEY/FILE_NAME?node-id=1:2,1:3
```

## Chức năng chính

### 1. Fetch Figma File
```javascript
import { getFigmaFile } from '@/lib/figma';
const file = await getFigmaFile('FILE_KEY');
```

### 2. Fetch Specific Nodes
```javascript
import { getFigmaNodes } from '@/lib/figma';
const nodes = await getFigmaNodes('FILE_KEY', ['1:2', '1:3']);
```

### 3. Export Images
```javascript
import { getFigmaImages } from '@/lib/figma';
const images = await getFigmaImages('FILE_KEY', ['1:2'], 'png', 2);
```

### 4. Parse thành React Component
```javascript
import { parseFigmaNodeToComponent, generateReactComponent } from '@/lib/figma';
const parsed = parseFigmaNodeToComponent(node, 'ComponentName');
const code = generateReactComponent(node, 'ComponentName');
```

## Các helper functions

- `extractFileKey(url)` - Trích xuất file key từ URL
- `extractNodeIds(url)` - Trích xuất node IDs từ URL
- `figmaColorToCss(color)` - Chuyển màu Figma sang CSS
- `figmaEffectToCss(effect)` - Chuyển shadow Figma sang CSS
- `figmaTypographyToCss(style)` - Chuyển typography Figma sang CSS

## Ví dụ workflow

1. User cung cấp Figma URL
2. Extract file key và node IDs
3. Fetch dữ liệu từ Figma API
4. Parse thông tin (màu, kích thước, spacing, etc)
5. Generate React component code
6. Tạo file component mới trong project

## File locations
- Main API: `frontend/src/lib/figma.js`
- Examples: `frontend/src/lib/figma.example.js`

## Environment Variables
- `VITE_FIGMA_ACCESS_TOKEN`: Figma Personal Access Token
