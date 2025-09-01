# Shadcn/UI Code Agents for opencode.ai

12 specialized opencode.ai agents for shadcn/ui development.

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

## Usage

1. Copy the agent files from `.claude/agents/` to your project's `.opencode/agent/` directory
2. Run the conversion script: `node scripts/convert-claude-agents.js`
3. The script will generate opencode.ai compatible agents and AGENTS.md file

## Quick Start

```bash
# Convert Claude Code agents to opencode.ai format
node scripts/convert-claude-agents.js

# Or generate AGENTS.md only
node scripts/convert-claude-agents.js --agents-md

# Validate converted agents
node scripts/convert-claude-agents.js --validate
```

## Available Agents

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

These agents work together to provide comprehensive shadcn/ui development support, from initial project setup through advanced customization and optimization.