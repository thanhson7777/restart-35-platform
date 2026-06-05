## Stack
React + Tailwind CSS + shadcn/ui

## Taste Skill activation
Follow the `design-taste-frontend` skill strictly for every UI task.
Read the brief before touching any code. Declare your design read aloud before writing.

## Project design read
- Product kind: SaaS web app
- Vibe: clean & minimal — Linear-clean, not sterile. Purposeful whitespace,
  strong typographic hierarchy, restrained motion.
- Aesthetic references: Linear.app, Vercel dashboard, Raycast, Clerk
- Audience: technical users / developers / power users

## Tailwind constraints
- Use Tailwind utility classes only — no arbitrary values unless necessary
- Spacing scale: stick to 4/6/8/10/12/16/20/24/32/40/48 (multiples of 4)
- Font sizes: text-xs / text-sm / text-base / text-lg / text-xl / text-2xl
- Font weights: font-normal (400) and font-medium (500) only
  → font-semibold/bold only for display headings, never body text
- Border radius: rounded-md (6px) for inputs/buttons, rounded-lg (8px) for cards,
  rounded-xl (12px) for modals/panels

## shadcn/ui rules
- Use shadcn primitives as base: Button, Card, Badge, Input, Select,
  Separator, Tooltip, Dialog, DropdownMenu
- Never override shadcn's internal padding with arbitrary Tailwind values
- Extend via className props, not by re-implementing the component

## Anti-slop checklist (enforce on every output)
Do NOT generate:
- Purple/indigo gradient hero backgrounds
- Three equal-width feature cards side by side with icons on top
- Generic glassmorphism panels
- Centered layout for everything (use left-aligned data layouts in app context)
- Skeleton loaders as placeholder comments — implement real states or omit
- "Made with ❤️" footer text
