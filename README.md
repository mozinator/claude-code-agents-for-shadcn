# Shadcn/UI Code Agents

12 specialized agents for shadcn/ui development with support for both **Claude Code** and **opencode.ai**.

## Agents

- **shadcn-installer** - Multi-framework setup (Next.js, Vite, Remix, Astro, Laravel)
- **shadcn-component-expert** - Component knowledge and usage patterns
- **shadcn-theming-specialist** - CSS variables, dark mode, brand integration
- **shadcn-form-builder** - React Hook Form, Zod validation, complex forms
- **shadcn-dashboard-architect** - Admin dashboards, data tables, layouts
- **shadcn-data-visualizer** - Recharts, D3.js, interactive visualizations
- **shadcn-animation-specialist** - Framer Motion, CSS animations, micro-interactions
- **shadcn-mobile-optimizer** - Mobile-first design, touch interfaces, PWA
- **shadcn-performance-auditor** - Bundle optimization, Core Web Vitals
- **shadcn-accessibility-auditor** - WCAG compliance, inclusive design
- **shadcn-testing-engineer** - Jest, RTL, Playwright, visual regression
- **shadcn-migration-specialist** - Migration from Material-UI, Chakra UI, Ant Design

## Compatibility & Installation

This collection supports both **Claude Code** and **opencode.ai** platforms:

### For Claude Code
1. Copy agent files from `.claude/agents/` to your project's `.claude/agents/` directory
2. Append contents from `CLAUDE.md` to your project's `CLAUDE.md` file

### For opencode.ai
1. Copy agent files from `.opencode/agent/` to your project's `.opencode/agent/` directory
2. The agents in `.opencode/agent/` are already configured for opencode.ai compatibility

### Keeping Both Platforms in Sync
- Claude Code agents are in `.claude/agents/` (original format)
- opencode.ai agents are in `.opencode/agent/` (opencode-compatible format)
- Both versions contain the same expertise and knowledge
- Update both directories when making changes to maintain compatibility

These agents work together to provide comprehensive shadcn/ui development support, from initial project setup through advanced customization and optimization.
