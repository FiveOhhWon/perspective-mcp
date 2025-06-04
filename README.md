# Perspective MCP Server

> 🤖 **Co-created with [Claude Code](https://claude.ai/referral/uralRLy1tw)** - Because even AI needs multiple perspectives! 

A Model Context Protocol (MCP) server that enables AI assistants to analyze problems through multiple professional perspectives and facilitate structured debates between viewpoints.

<a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Compatible-green" alt="MCP Compatible"></a>
<a href="https://github.com/FiveOhhWon/perspective-mcp/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>

## Overview

The Perspective MCP Server transforms how AI assistants approach complex problems by providing structured multi-stakeholder analysis. Whether you're making product decisions, evaluating technical architectures, or exploring business strategies, this server enables comprehensive analysis through diverse professional lenses.

### Key Features

- 🎭 **Multi-Perspective Analysis**: Analyze topics through various professional roles (PM, EM, Designer, etc.)
- 💬 **Structured Debates**: Facilitate 3-round debates between perspectives for deeper insights
- 🔄 **Dynamic Constraints**: Inject new considerations mid-analysis to explore scenarios
- 📊 **Comprehensive Summaries**: Generate detailed summaries of analyses and debates
- 🔗 **Context Awareness**: Each perspective builds upon previous insights

## Installation

### Using npx (recommended)

```bash
npx perspective-mcp
```

### From Source

```bash
git clone https://github.com/FiveOhhWon/perspective-mcp.git
cd perspective-mcp
npm install
npm run build
```

### Development Mode

```bash
npm run dev
```

## Configuration

### Claude Desktop

Add this configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\\Claude\\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "perspectives": {
      "command": "node",
      "args": ["/absolute/path/to/perspective-mcp/dist/index.js"]
    }
  }
}
```

Or using npx:

```json
{
  "mcpServers": {
    "perspectives": {
      "command": "npx",
      "args": ["perspective-mcp"]
    }
  }
}
```

## Usage

### Standard Analysis Mode

1. **Set up perspectives for your analysis:**

```
Use the set_perspectives tool to define roles:
- Product Manager: focuses on user needs, market fit, roadmap
- Engineering Manager: focuses on technical feasibility, resources
- UX Designer: focuses on user experience, accessibility
- Business Analyst: focuses on ROI, metrics, market trends
```

2. **Analyze through each perspective:**

```
Use the perspective tool to analyze the problem from each viewpoint.
Each perspective will build on previous insights.
```

### Debate Mode

After initial analysis, engage selected perspectives in structured debate:

1. **Start a debate between 2-4 perspectives**
2. **Round 1**: Each participant states their position
3. **Round 2**: Participants respond to conflicting viewpoints
4. **Round 3**: Synthesis and compromise proposals
5. **Generate summary** of key points and outcomes

## Available Tools

### `set_perspectives`

Define the professional roles/personas for analysis.

**Parameters:**
- `perspectives` (array, required): Array of perspective objects
  - `role` (string): Professional role name
  - `focusAreas` (string[]): Primary areas of focus
  - `personality` (string): Approach and traits

**Example:**
```json
{
  "perspectives": [
    {
      "role": "Product Manager",
      "focusAreas": ["user needs", "market fit", "roadmap"],
      "personality": "Strategic, user-centric, data-driven"
    }
  ]
}
```

### `perspective`

Perform analysis from the current perspective.

**Parameters:**
- `analysis` (string, required): The analysis from current perspective
- `nextPerspectiveNeeded` (boolean, required): Whether to advance to next perspective

**Returns:** Confirmation with progress tracking and next perspective details

### `start_debate`

Initiate a structured debate between selected perspectives.

**Parameters:**
- `topic` (string, required): The question or problem to debate
- `participants` (string[], required): 2-4 role names to participate

**Returns:** Debate initialization with round and speaker information

### `debate_turn`

Submit a statement in the ongoing debate.

**Parameters:**
- `statement` (string, required): The participant's statement
- `nextTurnNeeded` (boolean, required): Whether to proceed to next turn

**Returns:** Turn confirmation with round progression details

### `inject_constraint`

Add new constraints or considerations during debate.

**Parameters:**
- `constraint` (string, required): New constraint to consider

**Returns:** Confirmation with total constraints

### `debate_summary`

Generate comprehensive summary of the debate.

**Parameters:** None

**Returns:** Formatted summary with topic, participants, key points, and constraints

## Examples

### Product Decision Analysis

```javascript
// 1. Set up diverse perspectives
perspectives: [
  { role: "Product Manager", focusAreas: ["user value", "market fit"], personality: "Strategic" },
  { role: "Engineering Manager", focusAreas: ["feasibility", "technical debt"], personality: "Pragmatic" },
  { role: "UX Designer", focusAreas: ["usability", "accessibility"], personality: "User-advocate" },
  { role: "Data Analyst", focusAreas: ["metrics", "user behavior"], personality: "Evidence-based" }
]

// 2. Analyze feature proposal through each lens
// 3. Start debate on implementation approach
// 4. Inject constraint: "Timeline reduced by 1 month"
// 5. Generate summary with recommendations
```

### Technical Architecture Review

```javascript
// Set up technical perspectives (Architect, Security, DevOps, QA)
// Analyze proposed architecture
// Debate trade-offs between different approaches
// Consider new requirements mid-debate
// Synthesize optimal solution
```

## Project Structure

```
perspective-mcp/
├── src/
│   └── index.ts          # Main server implementation
├── examples/
│   ├── product-analysis.json    # Example perspective sets
│   └── debate-example.json      # Debate configuration example
├── dist/                 # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

**Perspectives not advancing:**
- Ensure `nextPerspectiveNeeded` is passed as boolean `true`, not string
- Check server logs for debug output

**Debate not starting:**
- Verify all participant roles exist in your perspectives
- Ensure 2-4 participants are selected

**Configuration not working:**
- Use absolute paths in configuration
- Restart Claude Desktop after config changes
- Check file permissions

## Security Considerations

This server operates with standard MCP permissions:
- No file system access required
- No network requests made
- All data processed locally
- Stateless between sessions (unless explicitly maintaining context)

## Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with the Model Context Protocol SDK by Anthropic.
