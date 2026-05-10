# Learnable Client — Frontend Instructions for Claude Code

## PROJECT OVERVIEW
Learnable is an AI-powered study platform. This is the Next.js 16 frontend.
Backend API base URL: `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).
All API calls go through `lib/api/client.ts` (axios instance `coreApi`).

## TECH STACK
- Next.js 16, App Router, TypeScript strict
- Tailwind CSS v4 (dark theme base)
- shadcn/ui components (already installed, see `components/ui/`)
- TanStack React Query v5 for all data fetching
- @xyflow/react v12 for graph canvas
- Zustand for auth state (`lib/stores/auth-store`)
- lucide-react icons
- sonner for toasts

## DESIGN SYSTEM

### Colors
- Page background: `bg-neutral-950`
- Cards/panels: `bg-white/[0.03]` with `border-white/10`
- Text primary: `text-neutral-100`
- Text muted: `text-neutral-400` / `text-neutral-500`
- Active/selected item: `bg-white/10`
- Done status: green tint (`bg-green-950/30` column, `bg-green-500` dot)
- In progress: `bg-yellow-400` dot
- Not started: `bg-neutral-500` dot
- Backlog: `bg-neutral-700` dot

### Component conventions
- `cn()` from `@/lib/utils` for all conditional classNames — always use it
- Pill buttons: `rounded-full border border-white/10 px-4 py-1.5 text-sm`
- Active pill: `bg-neutral-800`
- Tag chips: `rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-neutral-300`
- Chat input: `rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm`
- Cards: `rounded-2xl border border-white/10 bg-white/[0.03]`

## ROUTES
/dashboard/graphs/[graphId]                    → Graph canvas
/dashboard/graphs/[graphId]/nodes/[nodeId]     → Node page (Chat / Materials / Canvas / Kanban tabs)
/dashboard/kanban                              → Kanban board

## SCREENS

### Graph Canvas (`/dashboard/graphs/[graphId]`)
Main area: @xyflow/react canvas, dark bg.

Top-right toolbar:
- `[+]` round button — creates new node (`POST /api/v1/graphs/{id}/nodes`)
- `[✦ planning panel]` pill button — toggles right drawer

Node visual: crescent/half-circle shape. Outer circle `bg-neutral-200`, inner dark circle
offset top-left creating "moon" cutout. Label above-left of node. Small colored status dot on node.

Node click → hover popup card (left of node):
- Node title + green dot
- "📎 uploaded materials" row + count + chevron
- "{n} tasks" row + chevron
- "{n} subnodes" row + chevron
- Footer: "change node" (edit icon) + "delete node" (red)

Deadline rings: dashed circle overlaid on canvas grouping nodes,
colored pill label (`bg-red-900/60 text-red-300 rounded-full px-3 py-0.5 text-xs`)
at bottom edge of circle.

Planning panel (right drawer, ~400px wide):
- Header: "✦ planning panel" + collapse icon button
- Scrollable chat history area
- Bottom: `[+ Chat with AI]` pill input button
- On send → `POST /api/v1/ai/graphs/{graphId}/plan` (SSE stream)
- Stream tokens into the chat history display

### Node Page (`/dashboard/graphs/[graphId]/nodes/[nodeId]`)
Tabs: **Chat** | **Materials** | Canvas | Kanban

Sidebar on this page (different from graph canvas sidebar):
- "← back" link to graph
- "+ new task" button → create Task linked to this node
- "search" button
- "Tasks" section: list of tasks for this node
- Collapsible "Nodes" section (other nodes in graph)
- Collapsible "Subtopics" section

**Chat tab** — see detailed spec below.

**Materials tab**:
- Upload area for file (PDF, image, DOCX, TXT, audio)
- On upload → `POST /api/v1/ai/nodes/{nodeId}/materials/generate-from-file` (multipart)
- Shows generated flashcards (flip cards, front/back) and/or markdown notes
- Toggle: "cards" | "notes" | "both"

**Canvas tab**: stub, show "Coming soon in v1"

**Kanban tab**: task list filtered by this node, same card style as main kanban

### Kanban (`/dashboard/kanban`)
4 columns: backlog | not started | in progress | done

Column header: colored dot + name
"done" column: subtle green tint background `bg-green-950/20`

Task card:
- Title
- Description (muted, truncated)
- Tag chips: graph name + node/topic name + "deadline" (if applicable) + user tags
- Edit icon top-right

Task detail right panel (slides in on card click):
- Header: `»` breadcrumb + task title
- Status badge with colored dot
- Tags row
- Editable description field

Top-right: `[✦ planning panel]` same as graph canvas

## CHAT TAB SPEC (most important)

File: `app/dashboard/graphs/[graphId]/nodes/[nodeId]/page.tsx`
Component to build/replace: `NodeWorkspace` → `ChatTab`

Layout:
- Full-height panel (use `calc(100vh - 140px)` or flex with `flex-1`)
- Rounded-2xl card `border border-white/10 bg-white/[0.03]`
- Messages area: `flex flex-col gap-3 overflow-y-auto p-4 flex-1`
- Bottom input bar: pill input + send button, `sticky bottom-4 mx-4`

Message bubbles:
- User: right-aligned, `bg-neutral-700 rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[75%]`
- AI: left-aligned, plain text with whitespace-pre-wrap, `text-sm text-neutral-200 max-w-[80%]`
- AI streaming: append tokens to last AI message in state

Chat type toggle (above input or subtle):
- "theory" | "task" — affects `chat_type` field in request
- Default: "theory"

SSE call: `POST /api/v1/ai/nodes/{nodeId}/chat`
```json
{
  "message": "...",
  "chat_type": "theory",
  "node_id": "...",
  "chat_history": [{"role": "user"|"assistant", "content": "..."}]
}
```
Response: SSE stream `data: <token>\n\n`

State: `messages` array `{role, content}[]` in React state (session only for v0).
On send: push user message → start SSE → push empty AI message → append tokens.
On stream end: finalize message.

## API REFERENCE

### Endpoints used by frontend

**Graphs**
- `GET /api/v1/graphs` → list graphs
- `POST /api/v1/graphs` → `{name, description?}`
- `GET /api/v1/graphs/{id}`
- `PATCH /api/v1/graphs/{id}` → `{name?, description?, custom_prompt?}`
- `DELETE /api/v1/graphs/{id}`

**Nodes**
- `GET /api/v1/graphs/{id}/nodes`
- `POST /api/v1/graphs/{id}/nodes` → `{title, node_type?, description?, position_x, position_y, color?}`
- `GET /api/v1/graphs/{id}/nodes/{nodeId}`
- `PATCH /api/v1/graphs/{id}/nodes/{nodeId}`
- `DELETE /api/v1/graphs/{id}/nodes/{nodeId}`

**Edges**
- `GET /api/v1/graphs/{id}/edges`
- `POST /api/v1/graphs/{id}/edges` → `{source_node_id, target_node_id}`
- `DELETE /api/v1/graphs/{id}/edges/{edgeId}`

**Kanban**
- `GET /api/v1/kanban/tasks?graph_id=&node_id=` → list tasks
- `POST /api/v1/kanban/tasks` → `{title, description?, status?, tags?, graph_id?, topic_id?}`
- `PATCH /api/v1/kanban/tasks/{id}` → partial update
- `DELETE /api/v1/kanban/tasks/{id}`

**AI**
- `POST /api/v1/ai/graphs/{id}/generate` → multipart (file) → generates graph nodes from syllabus
- `POST /api/v1/ai/nodes/{nodeId}/chat` → SSE (body: ChatRequest)
- `POST /api/v1/ai/nodes/{nodeId}/materials/generate-from-file` → multipart (file + material_type form field)
- `POST /api/v1/ai/graphs/{id}/plan` → SSE (body: `{message: string}`)
- `POST /api/v1/ai/deadlines/{id}/prepare` → SSE

### SSE fetch pattern
```typescript
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/ai/nodes/${nodeId}/chat`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(body),
})
const reader = res.body!.getReader()
const decoder = new TextDecoder()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const text = decoder.decode(value)
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      const token = line.slice(6)
      if (token && token !== "[DONE]") {
        // append token to current AI message
      }
    }
  }
}
```

Auth token: `useAuthStore(state => state.token)` or however it's stored in the Zustand store.

## EXISTING FILES — DO NOT MODIFY STRUCTURE
- `components/lesson-graph-canvas.tsx` — graph canvas (edit internals, keep export)
- `lib/api/graphs.ts` — add functions, never remove existing ones
- `lib/api/client.ts` — do not touch
- `lib/stores/auth-store.ts` — do not touch
- `app/dashboard/graphs/[graphId]/nodes/[nodeId]/page.tsx` — fill in `NodeWorkspace`, keep all other code

## CODING RULES
- TypeScript strict: no `any`
- Always handle loading + error + empty states
- React Query for all server state; Zustand only for auth
- Optimistic updates for mutations that affect UI immediately (node drag, kanban drag)
- New API functions go in the relevant `lib/api/*.ts` file
- New hooks go in `hooks/` folder
- Co-located page components stay in the same page file if <100 lines; extract to `components/` if larger
- Never use `localStorage` for auth token — use whatever the existing store does