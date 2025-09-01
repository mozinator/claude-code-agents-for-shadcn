#!/usr/bin/env node

/**
 * Script to convert Claude Code agents to opencode.ai format
 *
 * This script converts Claude Code agent definitions (.claude/agents/*.md)
 * to opencode.ai compatible format (.opencode/agent/*.md) and generates AGENTS.md.
 *
 * The original Claude Code agents remain unchanged and can be used with Claude Code.
 * The converted agents are optimized for opencode.ai while maintaining full compatibility.
 *
 * Features:
 * - Maps Claude Code tools to opencode.ai tools
 * - Converts Claude model names to provider/model format
 * - Validates converted agents against opencode.ai specification
 * - Preserves agent descriptions and content
 * - Handles both simple and complex tool configurations
 * - Generates AGENTS.md with opencode.ai compatible format
 * - Special handling for shadcn/ui agents with modern React patterns
 * - Automatic categorization of agents by functionality
 * - TypeScript and Tailwind CSS optimizations
 *
 * Usage:
 *   node scripts/convert-claude-agents.js              # Convert all agents and generate AGENTS.md
 *   node scripts/convert-claude-agents.js --test       # Test conversion with sample
 *   node scripts/convert-claude-agents.js --validate   # Validate all converted agents
 *   node scripts/convert-claude-agents.js --agents-md  # Generate AGENTS.md only
 *   node scripts/convert-claude-agents.js --help       # Show help
 */

const fs = require('fs');
const path = require('path');

const CLAUDE_AGENTS_DIR = '.claude/agents';
const OPENCODE_AGENTS_DIR = '.opencode/agent';

// Tool mapping from Claude Code to opencode.ai
const TOOL_MAPPING = {
  'Read': { read: true },
  'Grep': { grep: true },
  'Glob': { glob: true },
  'Edit': { edit: true },
  'Write': { write: true },
  'MultiEdit': { edit: true },
  'file_editor': { edit: true, write: true },
  'terminal': { bash: true },
  'Bash': { bash: true },
  'web_search': { webfetch: true },
  'WebFetch': { webfetch: true },
  'Task': { read: true, grep: true, glob: true }, // Task agents typically need read tools
  'TodoWrite': { todowrite: true },
  'TodoRead': { todoread: true },
  // UIx specific tools
  'UIxComponent': { read: true, edit: true, write: true },
  'UIxStyling': { read: true, edit: true, write: true },
  'UIxState': { read: true, edit: true, write: true },
  'UIxRouting': { read: true, edit: true, write: true },
  'UIxForms': { read: true, edit: true, write: true },
  'UIxAnimation': { read: true, edit: true, write: true },
  'UIxAsync': { read: true, edit: true, write: true },
  'UIxInterop': { read: true, edit: true, write: true },
  'UIxMigration': { read: true, edit: true, write: true },
  '*': { // All tools for comprehensive agents
    read: true,
    grep: true,
    glob: true,
    edit: true,
    write: true,
    bash: true,
    webfetch: true,
    todowrite: true,
    todoread: true,
    list: true,
    patch: true
  }
};

// Default opencode agent configuration
const DEFAULT_CONFIG = {
  mode: 'subagent',
  temperature: 0.3,
  tools: {
    read: true,
    grep: true,
    glob: true,
    edit: false,
    write: false,
    bash: false,
    webfetch: false,
    todowrite: false,
    todoread: false,
    list: false,
    patch: false
  }
};

function parseFrontmatter(content) {
  const lines = content.split('\n');
  const frontmatter = {};
  let inFrontmatter = false;
  let currentKey = null;
  let inToolsSection = false;
  const tools = {};

  // Check if content has YAML frontmatter
  if (!content.trim().startsWith('---')) {
    return frontmatter; // Return empty frontmatter for files without YAML
  }

  for (const line of lines) {
    if (line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else {
        break;
      }
    }

    if (!inFrontmatter) continue;

    // Handle tools section specially
    if (line.trim() === 'tools:') {
      inToolsSection = true;
      currentKey = 'tools';
      continue;
    }

    // If we're in tools section and line starts with spaces, it's a tool
    if (inToolsSection && line.match(/^\s{2,}/)) {
      const toolMatch = line.trim().match(/^(\w+):\s*(.+)$/);
      if (toolMatch) {
        const [, toolName, toolValue] = toolMatch;
        tools[toolName] = toolValue === 'true';
      }
      continue;
    } 
    
    // If we encounter a non-indented line after tools, we're out of tools section
    if (inToolsSection && !line.match(/^\s/)) {
      inToolsSection = false;
      frontmatter.tools = tools;
    }

    // Parse regular key-value pairs
    const yamlMatch = line.match(/^(\w+):\s*(.+)$/);
    if (yamlMatch) {
      const [, key, value] = yamlMatch;
      currentKey = key;
      
      // Convert temperature to number
      if (key === 'temperature') {
        frontmatter[key] = parseFloat(value);
      } else {
        frontmatter[key] = value.trim();
      }
    }
  }

  // If we ended while still in tools section, save the tools
  if (inToolsSection) {
    frontmatter.tools = tools;
  }

  // Handle legacy tool format (comma-separated string)
  if (frontmatter.tools && typeof frontmatter.tools === 'string') {
    const tools = frontmatter.tools.split(',').map(t => t.trim());
    frontmatter.tools = tools;
  }

  return frontmatter;
}

function convertTools(claudeTools) {
  const opencodeTools = { ...DEFAULT_CONFIG.tools };

  if (Array.isArray(claudeTools)) {
    claudeTools.forEach(tool => {
      if (TOOL_MAPPING[tool]) {
        Object.assign(opencodeTools, TOOL_MAPPING[tool]);
      }
    });
  }

  return opencodeTools;
}

// Claude model name to opencode model mapping
const MODEL_MAPPING = {
  'sonnet': 'anthropic/claude-sonnet-3.5-20241022',
  'claude-3.5-sonnet': 'anthropic/claude-sonnet-3.5-20241022',
  'claude-3-sonnet': 'anthropic/claude-sonnet-3-20240229',
  'claude-3-opus': 'anthropic/claude-opus-3-20240229',
  'claude-3-haiku': 'anthropic/claude-haiku-3-20240307'
};

function convertAgent(claudeContent, filename) {
  const claudeFrontmatter = parseFrontmatter(claudeContent);

  // Check if file has YAML frontmatter (starts with ---)
  const hasFrontmatter = claudeContent.trim().startsWith('---');

  // Extract content after frontmatter or use entire content
  let body;
  if (hasFrontmatter) {
    const contentParts = claudeContent.split('---');
    body = contentParts.length > 2 ? contentParts.slice(2).join('---').trim() : '';
  } else {
    body = claudeContent.trim();
  }

  // Extract description from content if not in frontmatter
  let description = claudeFrontmatter.description;
  if (!description && body) {
    // Try to extract from first heading or first meaningful paragraph
    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        // Use first heading as description
        description = trimmed.substring(2).trim();
        break;
      } else if (trimmed && !trimmed.startsWith('#') && trimmed.length > 10) {
        // Use first paragraph as description (truncated)
        description = trimmed.length > 100 ? trimmed.substring(0, 100) + '...' : trimmed;
        break;
      }
    }
  }

  // Convert frontmatter
  const opencodeFrontmatter = {
    description: description || `Converted from Claude Code agent: ${filename.replace('.md', '')}`,
    mode: 'subagent',
    temperature: parseFloat(claudeFrontmatter.temperature) || 0.3,
    tools: convertTools(claudeFrontmatter.tools)
  };

  // Add model if specified in Claude agent
  if (claudeFrontmatter.model && MODEL_MAPPING[claudeFrontmatter.model]) {
    opencodeFrontmatter.model = MODEL_MAPPING[claudeFrontmatter.model];
  }

  // Build new content with proper YAML formatting
  let frontmatterYaml = '';
  for (const [key, value] of Object.entries(opencodeFrontmatter)) {
    if (key === 'tools') {
      frontmatterYaml += `tools:\n`;
      for (const [tool, enabled] of Object.entries(value)) {
        frontmatterYaml += `  ${tool}: ${enabled}\n`;
      }
    } else if (typeof value === 'string') {
      // Escape YAML special characters and use quotes for strings that need them
      const needsQuotes = value.includes(':') || value.includes('"') || value.includes("'") || 
                         value.includes('\n') || value.includes('#') || value.includes('@') ||
                         value.includes('|') || value.includes('>') || value.includes('[') ||
                         value.includes(']') || value.includes('{') || value.includes('}');
      
      if (needsQuotes) {
        // Use literal block scalar for multiline or complex strings
        if (value.includes('\n') || value.length > 100) {
          frontmatterYaml += `${key}: |\n`;
          const lines = value.split('\n');
          for (const line of lines) {
            frontmatterYaml += `  ${line}\n`;
          }
        } else {
          // Use double quotes and escape internal quotes
          const escapedValue = value.replace(/"/g, '\\"');
          frontmatterYaml += `${key}: "${escapedValue}"\n`;
        }
      } else {
        frontmatterYaml += `${key}: ${value}\n`;
      }
    } else {
      frontmatterYaml += `${key}: ${JSON.stringify(value)}\n`;
    }
  }

  return `---\n${frontmatterYaml.trim()}\n---\n\n${body}`;
}

function generateAgentsMd() {
  console.log('📝 Generating AGENTS.md for opencode.ai...\n');

  if (!fs.existsSync(CLAUDE_AGENTS_DIR)) {
    console.error(`❌ Claude agents directory not found: ${CLAUDE_AGENTS_DIR}`);
    process.exit(1);
  }

  const agentFiles = fs.readdirSync(CLAUDE_AGENTS_DIR)
    .filter(file => file.endsWith('.md'))
    .filter(file => file !== 'README.md')
    .sort();

  let agentsMd = `# Shadcn/UI Agents for opencode.ai

Specialized agents for comprehensive shadcn/ui development with modern React support.

## Available Agents

`;

   // Group agents by category
   const categories = {
     'Setup & Installation': [],
     'Component Development': [],
     'UI & Styling': [],
     'Forms & Data': [],
     'Advanced Features': [],
     'Quality & Migration': []
   };

  agentFiles.forEach(filename => {
    const filePath = path.join(CLAUDE_AGENTS_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf8');

    const agentName = filename.replace('.md', '');

    // Extract description from content (first meaningful paragraph after title)
    let description = `Agent for ${agentName.replace(/-/g, ' ')}`;
    const lines = content.split('\n');
    let foundTitle = false;
    let foundPurpose = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('# ')) {
        foundTitle = true;
        continue;
      }

      if (foundTitle && trimmed.startsWith('## Purpose')) {
        foundPurpose = true;
        continue;
      }

      if (foundPurpose && trimmed && !trimmed.startsWith('#') && trimmed.length > 20) {
        // Extract first paragraph after ## Purpose
        description = trimmed.length > 100 ? trimmed.substring(0, 100) + '...' : trimmed;
        break;
      }
    }

     // Categorize agents based on naming pattern
     if (agentName.includes('installer') || agentName.includes('setup')) {
       categories['Setup & Installation'].push({ name: agentName, description });
     } else if (agentName.includes('component') || agentName.includes('expert')) {
       categories['Component Development'].push({ name: agentName, description });
     } else if (agentName.includes('ui') || agentName.includes('styling') || agentName.includes('theming') || agentName.includes('animation') || agentName.includes('mobile')) {
       categories['UI & Styling'].push({ name: agentName, description });
     } else if (agentName.includes('form') || agentName.includes('data') || agentName.includes('dashboard')) {
       categories['Forms & Data'].push({ name: agentName, description });
     } else if (agentName.includes('performance') || agentName.includes('accessibility') || agentName.includes('testing')) {
       categories['Advanced Features'].push({ name: agentName, description });
     } else if (agentName.includes('migration')) {
       categories['Quality & Migration'].push({ name: agentName, description });
     } else {
       categories['Component Development'].push({ name: agentName, description });
     }
  });

  // Generate markdown for each category
  Object.entries(categories).forEach(([category, agents]) => {
    if (agents.length > 0) {
      agentsMd += `### ${category}\n\n`;
      agents.forEach(agent => {
        agentsMd += `- **${agent.name}** - ${agent.description}\n`;
      });
      agentsMd += '\n';
    }
  });

   // Add usage section
   agentsMd += `## Usage

These agents work together to provide comprehensive shadcn/ui development support, from initial project setup through advanced customization and optimization.

### Getting Started
1. Use \`shadcn-installer\` for multi-framework setup (Next.js, Vite, Remix, Astro, Laravel)
2. Employ \`shadcn-component-expert\` for component knowledge and usage patterns
3. Leverage \`shadcn-theming-specialist\` for CSS variables, dark mode, and brand integration

### Component Development
- Use \`shadcn-form-builder\` for React Hook Form, Zod validation, and complex forms
- Apply \`shadcn-dashboard-architect\` for admin dashboards, data tables, and layouts
- Employ \`shadcn-data-visualizer\` for Recharts, D3.js, and interactive visualizations

### Advanced Features
- Use \`shadcn-animation-specialist\` for Framer Motion, CSS animations, and micro-interactions
- Apply \`shadcn-mobile-optimizer\` for mobile-first design, touch interfaces, and PWA
- Employ \`shadcn-performance-auditor\` for bundle optimization and Core Web Vitals
- Leverage \`shadcn-accessibility-auditor\` for WCAG compliance and inclusive design

### Quality Assurance
- Use \`shadcn-testing-engineer\` for Jest, RTL, Playwright, and visual regression testing
- Apply \`shadcn-migration-specialist\` for migration from Material-UI, Chakra UI, Ant Design

## Agent Architecture

Each agent follows opencode.ai sub-agent conventions:
- **Focused Expertise**: Single-responsibility specialization for specific shadcn/ui development areas
- **Comprehensive Background**: Deep shadcn/ui and modern React knowledge with TypeScript context
- **Practical Implementation**: Real-world patterns, best practices, and contemporary tooling integration
- **Quality Focus**: Modern testing strategies, performance optimization, and accessibility compliance

## Modern React Support

All agents are designed to work with modern React and TypeScript:
- Full TypeScript support with proper type definitions
- Modern React patterns and hooks
- Tailwind CSS integration
- Component composition and reusability
- Performance optimization techniques

## Installation

1. Copy the agent files from \`.claude/agents/\` to your project's \`.opencode/agent/\` directory
2. Run the conversion script: \`node scripts/convert-claude-agents.js\`
3. The script will generate opencode.ai compatible agents and this AGENTS.md file

## Migration from Other UI Libraries

This collection provides comprehensive migration assistance from popular UI libraries:

- **Material-UI/Chakra UI**: Component mapping, theming conversion, and styling migration
- **Ant Design**: Form handling, data display components, and layout conversion
- **Custom Components**: Best practices for shadcn/ui adoption and integration

### Key Benefits of shadcn/ui
- **Copy & Paste**: No installation required, just copy components
- **Fully Customizable**: Modify components to match your design system
- **Accessible**: Built with accessibility best practices
- **TypeScript**: Full TypeScript support out of the box
- **Modern**: Uses latest React patterns and best practices

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [Framer Motion](https://www.framer.com/motion/)
- [Recharts](https://recharts.org/)

---

*Generated by convert-claude-agents.js on ${new Date().toISOString()}*
`;

  // Write AGENTS.md file
  fs.writeFileSync('AGENTS.md', agentsMd);
  console.log('✅ Generated AGENTS.md for opencode.ai');
}

function convertAllAgents() {
  // Ensure opencode agents directory exists
  if (!fs.existsSync(OPENCODE_AGENTS_DIR)) {
    fs.mkdirSync(OPENCODE_AGENTS_DIR, { recursive: true });
  }

  // Check if Claude agents directory exists
  if (!fs.existsSync(CLAUDE_AGENTS_DIR)) {
    console.error(`Claude Code agents directory not found: ${CLAUDE_AGENTS_DIR}`);
    process.exit(1);
  }

  // Read all Claude agent files
  const agentFiles = fs.readdirSync(CLAUDE_AGENTS_DIR)
    .filter(file => file.endsWith('.md'))
    .filter(file => file !== 'README.md'); // Skip README

  console.log(`Found ${agentFiles.length} Claude Code agents to convert:`);
  agentFiles.forEach(file => console.log(`  - ${file}`));

  let converted = 0;
  let skipped = 0;

  agentFiles.forEach(filename => {
    const claudePath = path.join(CLAUDE_AGENTS_DIR, filename);
    const opencodePath = path.join(OPENCODE_AGENTS_DIR, filename);

    try {
      const content = fs.readFileSync(claudePath, 'utf8');
      const convertedContent = convertAgent(content, filename);

      fs.writeFileSync(opencodePath, convertedContent);
      console.log(`✅ Converted: ${filename}`);
      converted++;
    } catch (error) {
      console.error(`❌ Failed to convert ${filename}:`, error.message);
      skipped++;
    }
  });

  console.log(`\nConversion complete:`);
  console.log(`  ✅ Converted: ${converted} agents`);
  console.log(`  ❌ Skipped: ${skipped} agents`);
  console.log(`\nConverted agents saved to: ${OPENCODE_AGENTS_DIR}`);

  // Generate AGENTS.md file
  generateAgentsMd();
}

// Removed - moved to end of file

function validateOpenCodeAgent(frontmatter, filename) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!frontmatter.description) {
    errors.push(`${filename}: Missing required 'description' field`);
  }

  // Valid mode values
  const validModes = ['primary', 'subagent', 'all'];
  if (frontmatter.mode && !validModes.includes(frontmatter.mode)) {
    errors.push(`${filename}: Invalid mode '${frontmatter.mode}'. Must be one of: ${validModes.join(', ')}`);
  }

  // Temperature range
  if (frontmatter.temperature && (frontmatter.temperature < 0 || frontmatter.temperature > 1)) {
    warnings.push(`${filename}: Temperature ${frontmatter.temperature} is outside recommended range 0.0-1.0`);
  }

  // Valid tools
  const validTools = ['bash', 'edit', 'write', 'read', 'grep', 'glob', 'list', 'patch', 'todowrite', 'todoread', 'webfetch'];
  if (frontmatter.tools && typeof frontmatter.tools === 'object') {
    for (const tool of Object.keys(frontmatter.tools)) {
      if (!validTools.includes(tool)) {
        warnings.push(`${filename}: Unknown tool '${tool}'. Valid tools: ${validTools.join(', ')}`);
      }
    }
  }

  return { errors, warnings };
}

function testConversion() {
  console.log('🧪 Testing conversion with a sample agent...\n');
  
  // Test with a simple agent
  const testAgent = `---
name: test-agent
description: Test agent for validation
model: sonnet
tools: Read, Grep, file_editor
---

This is a test agent.`;

  const converted = convertAgent(testAgent, 'test-agent.md');
  console.log('Converted agent:');
  console.log(converted);
  
  // Parse the result and validate
  const convertedFrontmatter = parseFrontmatter(converted);
  const validation = validateOpenCodeAgent(convertedFrontmatter, 'test-agent.md');
  
  console.log('\n📝 Validation results:');
  if (validation.errors.length === 0) {
    console.log('✅ No validation errors');
  } else {
    console.log('❌ Validation errors:', validation.errors);
  }
  
  if (validation.warnings.length > 0) {
    console.log('⚠️  Warnings:', validation.warnings);
  }
}

function validateAllConvertedAgents() {
  console.log('🔍 Validating all converted opencode agents...\n');
  
  if (!fs.existsSync(OPENCODE_AGENTS_DIR)) {
    console.error(`❌ Opencode agents directory not found: ${OPENCODE_AGENTS_DIR}`);
    console.error('Run the conversion first: node scripts/convert-claude-agents.js');
    process.exit(1);
  }
  
  const agentFiles = fs.readdirSync(OPENCODE_AGENTS_DIR)
    .filter(file => file.endsWith('.md'));
    
  let totalErrors = 0;
  let totalWarnings = 0;
  let validAgents = 0;
  
  agentFiles.forEach(filename => {
    const agentPath = path.join(OPENCODE_AGENTS_DIR, filename);
    const content = fs.readFileSync(agentPath, 'utf8');
    const frontmatter = parseFrontmatter(content);
    const validation = validateOpenCodeAgent(frontmatter, filename);
    
    if (validation.errors.length === 0 && validation.warnings.length === 0) {
      console.log(`✅ ${filename}`);
      validAgents++;
    } else {
      console.log(`\n📄 ${filename}:`);
      
      if (validation.errors.length > 0) {
        console.log('  ❌ Errors:');
        validation.errors.forEach(error => console.log(`    - ${error}`));
        totalErrors += validation.errors.length;
      }
      
      if (validation.warnings.length > 0) {
        console.log('  ⚠️  Warnings:');
        validation.warnings.forEach(warning => console.log(`    - ${warning}`));
        totalWarnings += validation.warnings.length;
      }
    }
  });
  
  console.log(`\n📊 Validation Summary:`);
  console.log(`  ✅ Valid agents: ${validAgents}/${agentFiles.length}`);
  console.log(`  ❌ Total errors: ${totalErrors}`);
  console.log(`  ⚠️  Total warnings: ${totalWarnings}`);
  
  if (totalErrors === 0) {
    console.log('\n🎉 All agents conform to opencode specification!');
  } else {
    console.log('\n❌ Some agents have validation errors that should be fixed.');
    process.exit(1);
  }
}

// Add CLI command support
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--test')) {
    testConversion();
  } else if (args.includes('--validate')) {
    validateAllConvertedAgents();
  } else if (args.includes('--agents-md')) {
    generateAgentsMd();
  } else if (args.includes('--help')) {
    console.log('Claude Code to opencode.ai agent converter\n');
    console.log('Usage:');
    console.log('  node scripts/convert-claude-agents.js              # Convert all agents and generate AGENTS.md');
    console.log('  node scripts/convert-claude-agents.js --test       # Test conversion with sample');
    console.log('  node scripts/convert-claude-agents.js --validate   # Validate all converted agents');
    console.log('  node scripts/convert-claude-agents.js --agents-md  # Generate AGENTS.md only');
    console.log('  node scripts/convert-claude-agents.js --help       # Show this help');
    console.log('\nFeatures:');
    console.log('  - Converts Claude Code agents to opencode.ai format');
    console.log('  - Maps tools from Claude to opencode.ai equivalents');
    console.log('  - Generates AGENTS.md with categorized agent list');
    console.log('  - Special handling for shadcn/ui agents with modern React patterns');
    console.log('  - Validates converted agents against opencode.ai specification');
    console.log('  - Preserves original Claude Code agents for dual compatibility');
  } else {
    convertAllAgents();
  }
}

module.exports = { convertAllAgents, convertAgent, parseFrontmatter, validateOpenCodeAgent, generateAgentsMd };