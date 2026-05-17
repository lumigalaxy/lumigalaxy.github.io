/**
 * Clawd Desktop Pet - OpenCode Plugin
 * 
 * This plugin translates OpenCode events to Clawd HTTP API,
 * enabling the desktop pet to react to OpenCode activity.
 * 
 * Installation:
 *   node hooks/install-opencode.js
 * 
 * Or manually copy to:
 *   ~/.config/opencode/plugins/clawd-opencode.ts (global)
 *   ./.opencode/plugins/clawd-opencode.ts (project-level)
 */

import type { Plugin } from "@opencode-ai/plugin"

// Clawd HTTP endpoint configuration
const CLAWD_HOST = "127.0.0.1"
const CLAWD_PORT = 23333
const CLAWD_STATE_URL = `http://${CLAWD_HOST}:${CLAWD_PORT}/state`
const CLAWD_TIMEOUT = 500

// Event to state mapping (mirrors clawd-hook.js EVENT_TO_STATE)
const EVENT_TO_STATE: Record<string, string> = {
  "session.created": "idle",
  "session.deleted": "sleeping",
  "tui.prompt.append": "thinking",
  "tool.execute.before": "working",
  "tool.execute.after": "working",
  "session.idle": "attention",
  "experimental.session.compacting": "sweeping",
  "tui.toast.show": "notification",
  "permission.asked": "notification",
  "permission.replied": "notification",
  "message.part.updated": "notification",
  "file.watcher.updated": "carrying",
}

// Track subagent sessions
const subagentSessions = new Set<string>()

interface ClawdStatePayload {
  state: string
  session_id: string
  event: string
  source_pid?: number
  cwd?: string
}

/**
 * Send state update to Clawd desktop pet
 */
async function sendStateToClawd(payload: ClawdStatePayload): Promise<void> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CLAWD_TIMEOUT)

    await fetch(CLAWD_STATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
  } catch {
    // Clawd not running - silently fail
    // This allows OpenCode to work without Clawd
  }
}

/**
 * Get current process PID for terminal focus
 */
function getCurrentPid(): number {
  return process.pid
}

/**
 * Extract session ID from various OpenCode event formats
 */
function getSessionId(event: any): string {
  // Try various locations where session ID might be found
  return (
    event.properties?.info?.id ||
    event.properties?.sessionId ||
    event.sessionId ||
    event.properties?.id ||
    "default"
  )
}

/**
 * Check if a tool call represents a subagent
 */
function isSubagentCall(input: any): boolean {
  return (
    input.tool === "subagent" ||
    input.tool === "agent" ||
    input.subagent === true ||
    (input.args && (input.args.subagent === true || input.args.agent === true))
  )
}

/**
 * Main Clawd Plugin
 */
const ClawdPlugin: Plugin = async ({ directory, project }) => {
  const cwd = directory || project?.path || process.cwd()

  return {
    /**
     * Generic event handler for session and UI events
     */
    event: async ({ event }) => {
      const sessionId = getSessionId(event)

      switch (event.type) {
        case "session.created": {
          await sendStateToClawd({
            state: EVENT_TO_STATE["session.created"],
            session_id: sessionId,
            event: "session.created",
            source_pid: getCurrentPid(),
            cwd,
          })
          break
        }

        case "session.deleted": {
          subagentSessions.delete(sessionId)
          await sendStateToClawd({
            state: EVENT_TO_STATE["session.deleted"],
            session_id: sessionId,
            event: "session.deleted",
          })
          break
        }

        case "tui.prompt.append": {
          await sendStateToClawd({
            state: EVENT_TO_STATE["tui.prompt.append"],
            session_id: sessionId,
            event: "tui.prompt.append",
          })
          break
        }

        case "session.idle": {
          await sendStateToClawd({
            state: EVENT_TO_STATE["session.idle"],
            session_id: sessionId,
            event: "session.idle",
          })
          break
        }

        case "tui.toast.show": {
          await sendStateToClawd({
            state: EVENT_TO_STATE["tui.toast.show"],
            session_id: sessionId,
            event: "tui.toast.show",
          })
          break
        }

        case "message.part.updated": {
          // Check if this is an elicitation (asking user for input)
          const isElicitation = event.properties?.message?.role === "assistant" &&
            event.properties?.message?.content?.includes("?")
          
          if (isElicitation) {
            await sendStateToClawd({
              state: EVENT_TO_STATE["message.part.updated"],
              session_id: sessionId,
              event: "message.part.updated",
            })
          }
          break
        }

        case "file.watcher.updated": {
          // Worktree create detection
          const isWorktreeChange = event.properties?.path?.includes(".git") ||
            event.properties?.paths?.some((p: string) => p.includes(".git"))
          
          if (isWorktreeChange) {
            await sendStateToClawd({
              state: EVENT_TO_STATE["file.watcher.updated"],
              session_id: sessionId,
              event: "file.watcher.updated",
            })
          }
          break
        }

        case "permission.asked": {
          // Permission request received - show notification animation
          // Note: OpenCode handles permission flow internally
          // We just trigger the visual notification in Clawd
          await sendStateToClawd({
            state: EVENT_TO_STATE["permission.asked"],
            session_id: sessionId,
            event: "permission.asked",
          })
          break
        }

        case "permission.replied": {
          // Permission was replied to - show notification
          await sendStateToClawd({
            state: EVENT_TO_STATE["permission.replied"],
            session_id: sessionId,
            event: "permission.replied",
          })
          break
        }

        case "session.compacted": {
          // Session compaction completed
          await sendStateToClawd({
            state: "attention",
            session_id: sessionId,
            event: "session.compacted",
          })
          break
        }
      }
    },

    /**
     * Session compaction hook (experimental)
     * This is a hook, not an event - it fires before compaction starts
     */
    "experimental.session.compacting": async (input) => {
      const sessionId = input.sessionID || "default"
      await sendStateToClawd({
        state: "sweeping",
        session_id: sessionId,
        event: "experimental.session.compacting",
        cwd,
      })
    },

    /**
     * Tool execution start hook
     */
    "tool.execute.before": async (input) => {
      const sessionId = input.sessionID

      if (isSubagentCall(input)) {
        subagentSessions.add(sessionId)
        await sendStateToClawd({
          state: "juggling",
          session_id: sessionId,
          event: "subagent.start",
          cwd,
        })
      } else {
        await sendStateToClawd({
          state: EVENT_TO_STATE["tool.execute.before"],
          session_id: sessionId,
          event: "tool.execute.before",
          cwd,
        })
      }
    },

    /**
     * Tool execution end hook
     */
    "tool.execute.after": async (input, output) => {
      const sessionId = input.sessionID
      const hasError = output && (output as any).error != null

      // Check if subagent ended
      if (subagentSessions.has(sessionId)) {
        // Check if we're still in a subagent context
        const stillSubagent = (output as any)?.subagent === true ||
          ((output as any)?.subagentDepth || 0) > 0

        if (!stillSubagent) {
          subagentSessions.delete(sessionId)
          await sendStateToClawd({
            state: "working",
            session_id: sessionId,
            event: "subagent.stop",
            cwd,
          })
          return
        }
      }

      // Handle error state
      if (hasError) {
        await sendStateToClawd({
          state: "error",
          session_id: sessionId,
          event: "tool.execute.failure",
          cwd,
        })
      } else {
        await sendStateToClawd({
          state: EVENT_TO_STATE["tool.execute.after"],
          session_id: sessionId,
          event: "tool.execute.after",
          cwd,
        })
      }
    },
  }
}

export default ClawdPlugin
