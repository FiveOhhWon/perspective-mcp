#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

interface Perspective {
  role: string;
  focusAreas: string[];
  personality: string;
}

interface PerspectiveAnalysis {
  analysis: string;
  nextPerspectiveNeeded: boolean;
}

interface DebateTurn {
  round: number;
  persona: string;
  statement: string;
  respondingTo?: string;
  timestamp: Date;
}

interface DebateState {
  active: boolean;
  topic: string;
  participants: Perspective[];
  currentRound: number;
  currentTurnIndex: number;
  history: DebateTurn[];
  constraints: string[];
}

class PerspectiveAnalysisServer {
  perspectives: Perspective[] = [];
  private currentPerspectiveIndex: number = 0;
  private analyses: Map<string, string> = new Map();
  private debateState: DebateState = {
    active: false,
    topic: '',
    participants: [],
    currentRound: 0,
    currentTurnIndex: 0,
    history: [],
    constraints: []
  };
  
  constructor() {
    this.resetState();
  }

  private resetState() {
    this.perspectives = [];
    this.currentPerspectiveIndex = 0;
    this.analyses.clear();
    this.resetDebateState();
  }

  private resetDebateState() {
    this.debateState = {
      active: false,
      topic: '',
      participants: [],
      currentRound: 0,
      currentTurnIndex: 0,
      history: [],
      constraints: []
    };
  }

  setPerspectives(perspectives: Perspective[]) {
    this.resetState();
    this.perspectives = perspectives;
  }

  getCurrentPerspective(): Perspective | null {
    if (this.currentPerspectiveIndex >= this.perspectives.length) {
      return null;
    }
    return this.perspectives[this.currentPerspectiveIndex];
  }

  addAnalysis(analysis: string, moveToNext: boolean): PerspectiveAnalysis {
    const currentPerspective = this.getCurrentPerspective();
    if (currentPerspective) {
      this.analyses.set(currentPerspective.role, analysis);
    }

    if (moveToNext) {
      this.currentPerspectiveIndex++;
    }

    const nextPerspectiveNeeded = this.currentPerspectiveIndex < this.perspectives.length;

    return {
      analysis,
      nextPerspectiveNeeded
    };
  }

  getContext(): {
    currentPerspective: Perspective | null;
    previousAnalyses: Array<{ role: string; analysis: string }>;
    perspectivesRemaining: number;
  } {
    const previousAnalyses = Array.from(this.analyses.entries()).map(([role, analysis]) => ({
      role,
      analysis
    }));

    return {
      currentPerspective: this.getCurrentPerspective(),
      previousAnalyses,
      perspectivesRemaining: Math.max(0, this.perspectives.length - this.currentPerspectiveIndex)
    };
  }

  // Debate mode methods
  startDebate(topic: string, participantRoles: string[]): void {
    if (participantRoles.length < 2 || participantRoles.length > 4) {
      throw new Error("Debate requires 2-4 participants");
    }

    const participants = participantRoles
      .map(role => this.perspectives.find(p => p.role === role))
      .filter(p => p !== undefined) as Perspective[];

    if (participants.length !== participantRoles.length) {
      throw new Error("One or more specified personas not found in perspectives");
    }

    this.resetDebateState();
    this.debateState = {
      active: true,
      topic,
      participants,
      currentRound: 1,
      currentTurnIndex: 0,
      history: [],
      constraints: []
    };
  }

  getCurrentDebateParticipant(): Perspective | null {
    if (!this.debateState.active) return null;
    const index = this.debateState.currentTurnIndex % this.debateState.participants.length;
    return this.debateState.participants[index];
  }

  addDebateTurn(statement: string, moveToNext: boolean): {
    round: number;
    participant: string;
    nextParticipantNeeded: boolean;
    isRoundComplete: boolean;
  } {
    if (!this.debateState.active) {
      throw new Error("No active debate. Use start_debate first.");
    }

    const currentParticipant = this.getCurrentDebateParticipant();
    if (!currentParticipant) {
      throw new Error("No current participant found");
    }

    // Determine who this participant is responding to in rounds 2+
    let respondingTo: string | undefined;
    if (this.debateState.currentRound > 1) {
      const previousTurns = this.debateState.history.filter(
        turn => turn.round === this.debateState.currentRound - 1
      );
      if (previousTurns.length > 0) {
        // Find conflicting viewpoint from previous round
        respondingTo = previousTurns.find(turn => turn.persona !== currentParticipant.role)?.persona;
      }
    }

    const turn: DebateTurn = {
      round: this.debateState.currentRound,
      persona: currentParticipant.role,
      statement,
      respondingTo,
      timestamp: new Date()
    };

    this.debateState.history.push(turn);

    let isRoundComplete = false;
    let nextParticipantNeeded = true;

    if (moveToNext) {
      this.debateState.currentTurnIndex++;
      
      // Check if round is complete
      const turnsInRound = this.debateState.currentTurnIndex;
      const participantsCount = this.debateState.participants.length;
      
      if (turnsInRound % participantsCount === 0) {
        isRoundComplete = true;
        
        // Move to next round if not at round 3
        if (this.debateState.currentRound < 3) {
          this.debateState.currentRound++;
        } else {
          // Debate is complete after round 3
          nextParticipantNeeded = false;
        }
      }
    }

    const nextParticipant = this.getCurrentDebateParticipant();

    return {
      round: this.debateState.currentRound,
      participant: currentParticipant.role,
      nextParticipantNeeded: nextParticipantNeeded && this.debateState.currentRound <= 3,
      isRoundComplete
    };
  }

  addConstraint(constraint: string): void {
    if (!this.debateState.active) {
      throw new Error("No active debate to add constraints to");
    }
    this.debateState.constraints.push(constraint);
  }

  getDebateContext(): {
    active: boolean;
    topic: string;
    currentRound: number;
    currentParticipant: Perspective | null;
    participants: Perspective[];
    history: DebateTurn[];
    constraints: string[];
    previousRoundStatements: DebateTurn[];
  } {
    const previousRoundStatements = this.debateState.currentRound > 1
      ? this.debateState.history.filter(turn => turn.round === this.debateState.currentRound - 1)
      : [];

    return {
      active: this.debateState.active,
      topic: this.debateState.topic,
      currentRound: this.debateState.currentRound,
      currentParticipant: this.getCurrentDebateParticipant(),
      participants: this.debateState.participants,
      history: this.debateState.history,
      constraints: this.debateState.constraints,
      previousRoundStatements
    };
  }

  generateDebateSummary(): {
    topic: string;
    participants: string[];
    rounds: number;
    keyPoints: Map<string, string[]>;
    constraints: string[];
    totalTurns: number;
  } {
    if (!this.debateState.active && this.debateState.history.length === 0) {
      throw new Error("No debate to summarize");
    }

    const keyPoints = new Map<string, string[]>();
    
    // Group key points by participant
    this.debateState.participants.forEach(p => {
      const turns = this.debateState.history.filter(turn => turn.persona === p.role);
      keyPoints.set(p.role, turns.map(turn => turn.statement));
    });

    return {
      topic: this.debateState.topic,
      participants: this.debateState.participants.map(p => p.role),
      rounds: this.debateState.currentRound,
      keyPoints,
      constraints: this.debateState.constraints,
      totalTurns: this.debateState.history.length
    };
  }
}

const perspectiveServer = new PerspectiveAnalysisServer();

const server = new Server(
  {
    name: "perspective-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "set_perspectives",
        description: "Define the list of professional roles/personas that will analyze the topic",
        inputSchema: {
          type: "object",
          properties: {
            perspectives: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  role: {
                    type: "string",
                    description: "The professional role or persona name"
                  },
                  focusAreas: {
                    type: "array",
                    items: {
                      type: "string"
                    },
                    description: "Primary focus areas for this perspective"
                  },
                  personality: {
                    type: "string",
                    description: "Personality traits and approach style"
                  }
                },
                required: ["role", "focusAreas", "personality"]
              },
              description: "Array of perspective objects"
            }
          },
          required: ["perspectives"]
        }
      },
      {
        name: "perspective",
        description: "Perform analysis from the current perspective, building on previous insights",
        inputSchema: {
          type: "object",
          properties: {
            analysis: {
              type: "string",
              description: "The analysis from the current perspective"
            },
            nextPerspectiveNeeded: {
              type: "boolean",
              description: "Whether to move to the next perspective after this analysis"
            },
            nextThoughtNeeded: {
              type: "boolean",
              description: "Alias for nextPerspectiveNeeded for compatibility"
            }
          },
          required: ["analysis"],
          oneOf: [
            { required: ["nextPerspectiveNeeded"] },
            { required: ["nextThoughtNeeded"] }
          ]
        }
      },
      {
        name: "start_debate",
        description: "Start a debate between selected personas on a specific topic",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "The specific question or constraint to debate"
            },
            participants: {
              type: "array",
              items: {
                type: "string"
              },
              minItems: 2,
              maxItems: 4,
              description: "Array of 2-4 persona roles to participate in the debate"
            }
          },
          required: ["topic", "participants"]
        }
      },
      {
        name: "debate_turn",
        description: "Submit a statement in the ongoing debate",
        inputSchema: {
          type: "object",
          properties: {
            statement: {
              type: "string",
              description: "The participant's statement or response"
            },
            nextTurnNeeded: {
              type: "boolean",
              description: "Whether to proceed to the next turn"
            }
          },
          required: ["statement", "nextTurnNeeded"]
        }
      },
      {
        name: "inject_constraint",
        description: "Add a new constraint or consideration to the ongoing debate",
        inputSchema: {
          type: "object",
          properties: {
            constraint: {
              type: "string",
              description: "The new constraint or consideration to add"
            }
          },
          required: ["constraint"]
        }
      },
      {
        name: "debate_summary",
        description: "Generate a summary of the debate including key points from each participant",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "set_perspectives": {
      const { perspectives } = request.params.arguments as { perspectives: Perspective[] };
      
      if (!Array.isArray(perspectives) || perspectives.length === 0) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Perspectives must be a non-empty array"
        );
      }

      perspectiveServer.setPerspectives(perspectives);
      
      return {
        content: [
          {
            type: "text",
            text: `Successfully set ${perspectives.length} perspectives. Starting with: ${perspectives[0].role}`
          }
        ]
      };
    }

    case "perspective": {
      const args = request.params.arguments as {
        analysis: string;
        nextPerspectiveNeeded?: boolean;
        nextThoughtNeeded?: boolean;
      };

      const { analysis } = args;
      // Support both parameter names for compatibility
      let nextPerspectiveNeeded = args.nextPerspectiveNeeded ?? args.nextThoughtNeeded ?? false;
      
      // Handle string "true"/"false" for compatibility
      if (typeof nextPerspectiveNeeded === 'string') {
        nextPerspectiveNeeded = nextPerspectiveNeeded === 'true';
      }

      if (typeof analysis !== 'string' || analysis.trim() === '') {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Analysis must be a non-empty string"
        );
      }

      const context = perspectiveServer.getContext();
      
      if (!context.currentPerspective) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "No perspectives defined or all perspectives completed. Use set_perspectives first."
        );
      }

      const result = perspectiveServer.addAnalysis(analysis, nextPerspectiveNeeded);
      const updatedContext = perspectiveServer.getContext();

      let responseText = `Analysis recorded for ${context.currentPerspective.role}.\\n`;
      responseText += `Progress: ${updatedContext.previousAnalyses.length}/${perspectiveServer.perspectives.length} perspectives completed.\\n`;
      
      if (result.nextPerspectiveNeeded && updatedContext.currentPerspective) {
        responseText += `\\nNext perspective: ${updatedContext.currentPerspective.role}\\n`;
        responseText += `Focus areas: ${updatedContext.currentPerspective.focusAreas.join(", ")}\\n`;
        responseText += `Personality: ${updatedContext.currentPerspective.personality}`;
      } else if (!result.nextPerspectiveNeeded || !updatedContext.currentPerspective) {
        responseText += `\\nAll perspectives completed. Total analyses: ${updatedContext.previousAnalyses.length}`;
      }

      return {
        content: [
          {
            type: "text",
            text: responseText
          }
        ]
      };
    }

    case "start_debate": {
      const { topic, participants } = request.params.arguments as {
        topic: string;
        participants: string[];
      };

      try {
        perspectiveServer.startDebate(topic, participants);
        const context = perspectiveServer.getDebateContext();
        
        return {
          content: [
            {
              type: "text",
              text: `Debate started on topic: "${topic}"\\n\\nParticipants:\\n${
                participants.map((p, i) => `${i + 1}. ${p}`).join('\\n')
              }\\n\\nRound 1: Initial positions\\nCurrent speaker: ${context.currentParticipant?.role}`
            }
          ]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InvalidParams,
          error instanceof Error ? error.message : "Failed to start debate"
        );
      }
    }

    case "debate_turn": {
      const { statement, nextTurnNeeded } = request.params.arguments as {
        statement: string;
        nextTurnNeeded: boolean;
      };

      try {
        const result = perspectiveServer.addDebateTurn(statement, nextTurnNeeded);
        const context = perspectiveServer.getDebateContext();
        
        let responseText = `Statement recorded for ${result.participant}.\\n`;
        
        if (result.isRoundComplete && result.nextParticipantNeeded) {
          responseText += `\\nRound ${result.round - 1} complete. Starting Round ${result.round}.\\n`;
          if (result.round === 2) {
            responseText += "Participants will now respond to conflicting viewpoints.\\n";
          } else if (result.round === 3) {
            responseText += "Final round: Synthesis and compromise proposals.\\n";
          }
        }
        
        if (result.nextParticipantNeeded && context.currentParticipant) {
          responseText += `\\nNext speaker: ${context.currentParticipant.role}`;
          if (context.previousRoundStatements.length > 0) {
            const toRespond = context.previousRoundStatements.find(
              s => s.persona !== context.currentParticipant?.role
            );
            if (toRespond) {
              responseText += ` (responding to ${toRespond.persona})`;
            }
          }
        } else if (!result.nextParticipantNeeded) {
          responseText += `\\nDebate complete after ${context.history.length} turns.`;
        }

        return {
          content: [
            {
              type: "text",
              text: responseText
            }
          ]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          error instanceof Error ? error.message : "Failed to process debate turn"
        );
      }
    }

    case "inject_constraint": {
      const { constraint } = request.params.arguments as { constraint: string };

      try {
        perspectiveServer.addConstraint(constraint);
        const context = perspectiveServer.getDebateContext();
        
        return {
          content: [
            {
              type: "text",
              text: `New constraint added: "${constraint}"\\n\\nTotal constraints: ${
                context.constraints.length
              }\\nCurrent speaker should consider this in their response.`
            }
          ]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          error instanceof Error ? error.message : "Failed to add constraint"
        );
      }
    }

    case "debate_summary": {
      try {
        const summary = perspectiveServer.generateDebateSummary();
        
        let responseText = `## Debate Summary\\n\\n`;
        responseText += `**Topic:** ${summary.topic}\\n\\n`;
        responseText += `**Participants:** ${summary.participants.join(', ')}\\n\\n`;
        responseText += `**Duration:** ${summary.rounds} rounds, ${summary.totalTurns} total statements\\n\\n`;
        
        if (summary.constraints.length > 0) {
          responseText += `**Constraints Added:**\\n`;
          summary.constraints.forEach((c, i) => {
            responseText += `${i + 1}. ${c}\\n`;
          });
          responseText += `\\n`;
        }
        
        responseText += `**Key Points by Participant:**\\n`;
        summary.keyPoints.forEach((points, participant) => {
          responseText += `\\n### ${participant}\\n`;
          points.forEach((point, i) => {
            responseText += `Round ${i + 1}: ${point.substring(0, 150)}${point.length > 150 ? '...' : ''}\\n`;
          });
        });

        return {
          content: [
            {
              type: "text",
              text: responseText
            }
          ]
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          error instanceof Error ? error.message : "Failed to generate summary"
        );
      }
    }

    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`
      );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Perspective MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});