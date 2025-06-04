# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build and Development
```bash
npm run build    # Compile TypeScript to JavaScript (outputs to dist/)
npm run dev      # Run in development mode with hot reload using tsx
npm start        # Run the compiled production version
```

### Testing the MCP Server
```bash
# Run the server directly for testing
npx tsx src/index.ts

# Or after building
node dist/index.js
```

## Architecture

This is an MCP (Model Context Protocol) server implemented as a single TypeScript file (`src/index.ts`) that provides tools for multi-perspective analysis and structured debates.

### Core Components

1. **PerspectiveAnalysisServer Class**: Manages all state for both analysis modes
   - `perspectives`: Array of professional roles with focus areas
   - `analyses`: Map tracking analysis for each perspective
   - `debateState`: Manages ongoing debate sessions

2. **Two Operation Modes**:
   - **Sequential Analysis**: Each perspective analyzes in order, building on previous insights
   - **Debate Mode**: 2-4 perspectives engage in structured 3-round debates

3. **MCP Tools Exposed**:
   - `set_perspectives`: Initialize with professional roles
   - `perspective`: Perform analysis from current perspective
   - `start_debate`: Begin structured debate
   - `debate_turn`: Submit debate statement
   - `inject_constraint`: Add constraints mid-debate
   - `debate_summary`: Generate final summary

### Key Implementation Details

- Uses stdio transport for MCP communication
- Strict TypeScript with comprehensive type definitions
- Error handling with MCP-specific error codes (e.g., -32602 for invalid params)
- State validation ensures proper workflow progression
- All server state is managed in-memory (resets on restart)

### Development Notes

- The server is stateful - perspectives must be set before analysis
- Debate mode enforces strict turn order and round progression
- Each debate round has specific purposes (initial positions → responses → synthesis)
- The `nextPerspectiveNeeded` flag controls analysis flow
- Constraint injection only works during active debates