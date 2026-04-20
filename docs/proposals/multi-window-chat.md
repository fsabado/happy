# Multi-Window Chat View Proposal

**Status:** Proposal
**Created:** 2026-04-03
**Difficulty:** Medium
**Estimated Effort:** 1-2 weeks for polished implementation

## Executive Summary

This proposal outlines adding support for viewing multiple chat sessions simultaneously in split-screen or grid layouts on the Happy web and desktop applications. This feature would enable users to:

- Work on multiple tasks in parallel with visual context
- Reference previous conversations while working on new ones
- Compare outputs or approaches across different sessions
- Improve productivity for power users on larger screens

## Current Architecture

### Tech Stack
- **Framework:** React Native with Expo SDK 55
- **Language:** TypeScript (strict mode)
- **Routing:** Expo Router v6 (file-based routing)
- **State Management:** Zustand (global state store)
- **Styling:** React Native Unistyles (theme-aware, responsive)
- **Real-time:** Socket.io WebSocket connections
- **Navigation:** React Navigation Drawer (tablet/desktop layouts)
- **Platforms:** iOS, Android, Web, macOS (via Tauri)

### Current Session View Architecture

**File:** `/sources/-session/SessionView.tsx` (668 lines)

```
SessionView (wrapper)
  ├─ ChatHeaderView (sticky header with avatar, session name, path)
  ├─ SessionViewLoaded (main content)
  │   ├─ StatusTopBar (shows model, branch, cwd)
  │   ├─ AgentContentView (chat content container)
  │   │   ├─ ChatList (FlatList of messages, inverted)
  │   │   └─ AgentInput (message input with autocomplete, file viewer, mic)
  │   └─ StatusBottomBar (shows tokens, approvals)
  └─ SessionActionsPopover (web only)
```

**Current Responsive Behavior:**
- **Phone:** Full-screen single session, tab bar at bottom
- **Tablet/Desktop:** Permanent drawer sidebar (250-360px) + main session area

**Key Files:**
- `/sources/-session/SessionView.tsx` - Main session container
- `/sources/components/AgentContentView.tsx` - Layout container for content + input
- `/sources/components/ChatList.tsx` - Message list renderer
- `/sources/components/AgentInput.tsx` - Complex input component (64KB)
- `/sources/sync/storage.ts` - Zustand state store
- `/sources/components/SidebarNavigator.tsx` - Drawer layout pattern
- `/sources/utils/responsive.ts` - Device detection & breakpoints

### State Management

**Zustand Store** (`/sources/sync/storage.ts`):
```typescript
interface StorageState {
    sessions: Record<string, Session>
    sessionMessages: Record<string, SessionMessages>
    sessionListViewData: SessionListViewItem[] | null
    machines: Record<string, Machine>
    artifacts: Record<string, DecryptedArtifact>

    socketStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
    realtimeStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
    isDataReady: boolean

    settings: Settings
    localSettings: LocalSettings
}
```

**Current Assumptions:**
- Single active session per screen
- Navigation stack expects one session view at a time
- Input state managed globally per session
- Keyboard handling assumes single input focus

## Why This Is Feasible

### Strengths

1. **State management is ready** - Zustand can easily handle multiple simultaneous sessions
2. **Components are reusable** - SessionView can be instantiated multiple times
3. **Existing multi-pane pattern** - Drawer navigator already shows sidebar + main content
4. **Responsive system exists** - Device detection and layout switching already implemented
5. **Clean component architecture** - React components are naturally composable
6. **Web platform support** - Already rendering to web with good performance

### Challenges

1. **SessionView assumes single instance** - Tightly coupled to navigation/routing
2. **Input state management** - Each session needs independent input focus/keyboard handling
3. **Routing paradigm shift** - Current router assumes one active session per route
4. **Layout complexity** - Need new split-screen/grid layout components
5. **Responsive behavior** - Small screens should collapse to single view
6. **Keyboard handling** - `AgentContentView` uses keyboard controller for single view

## Proposed Implementation

### Phase 1: Component Refactoring (2-3 days)

**Goal:** Make SessionView reusable in multi-window contexts

#### 1.1 Create Standalone ChatWindow Component

Extract SessionView from navigation dependencies:

**New File:** `/sources/components/ChatWindow.tsx`

```typescript
interface ChatWindowProps {
  sessionId: string;
  showHeader?: boolean;
  onClose?: () => void;
  focusMode?: 'auto' | 'manual';
}

export function ChatWindow({
  sessionId,
  showHeader = true,
  onClose,
  focusMode = 'auto'
}: ChatWindowProps) {
  // Self-contained session view
  // Manages own input focus state
  // Optional header for embedded contexts
  return (
    <View style={styles.container}>
      {showHeader && <ChatHeaderView sessionId={sessionId} onClose={onClose} />}
      <SessionViewLoaded
        sessionId={sessionId}
        focusMode={focusMode}
      />
    </View>
  );
}
```

#### 1.2 Decouple Input State

**Update:** `/sources/components/AgentInput.tsx`

Add per-window input focus management:

```typescript
interface AgentInputProps {
  sessionId: string;
  windowId?: string; // New: unique identifier for multi-window contexts
  autoFocus?: boolean;
}

// Use React.useId() or custom hook for window-specific state
const windowContext = useWindowContext(windowId);
```

#### 1.3 Refactor Keyboard Handling

**Update:** `/sources/components/AgentContentView.tsx`

Support multiple keyboard contexts:

```typescript
interface AgentContentViewProps {
  sessionId: string;
  windowId?: string;
  keyboardBehavior?: 'shared' | 'isolated';
}

// In isolated mode, each window manages its own keyboard state
const keyboardController = useWindowKeyboard(windowId, keyboardBehavior);
```

### Phase 2: Layout System (2-3 days)

**Goal:** Build flexible multi-window layout components

#### 2.1 Create MultiWindowLayout Component

**New File:** `/sources/components/MultiWindowLayout.tsx`

```typescript
type LayoutMode = 'single' | 'split-horizontal' | 'split-vertical' | 'grid-2x2';

interface MultiWindowLayoutProps {
  sessions: string[]; // Array of session IDs to display
  layout: LayoutMode;
  onLayoutChange?: (layout: LayoutMode) => void;
  onSessionClose?: (sessionId: string) => void;
}

export function MultiWindowLayout({
  sessions,
  layout,
  onLayoutChange,
  onSessionClose
}: MultiWindowLayoutProps) {
  const windowIds = useMemo(
    () => sessions.map(id => `window-${id}-${Date.now()}`),
    [sessions]
  );

  return (
    <View style={styles.container}>
      {layout === 'split-horizontal' && (
        <ResizableSplitView orientation="horizontal">
          {sessions.map((sessionId, idx) => (
            <ChatWindow
              key={windowIds[idx]}
              sessionId={sessionId}
              onClose={() => onSessionClose?.(sessionId)}
            />
          ))}
        </ResizableSplitView>
      )}
      {/* Other layout modes... */}
    </View>
  );
}
```

#### 2.2 Build ResizableSplitView Component

**New File:** `/sources/components/ResizableSplitView.tsx`

```typescript
interface ResizableSplitViewProps {
  orientation: 'horizontal' | 'vertical';
  children: React.ReactNode[];
  defaultSizes?: number[]; // Percentages, e.g., [50, 50]
  minSize?: number; // Minimum size in pixels
  onResize?: (sizes: number[]) => void;
}

export function ResizableSplitView({
  orientation,
  children,
  defaultSizes,
  minSize = 300,
  onResize
}: ResizableSplitViewProps) {
  // Implement drag-to-resize dividers
  // Save sizes to local storage
  // Handle responsive collapse on small screens
}
```

#### 2.3 Responsive Collapse Behavior

**Update:** `/sources/utils/responsive.ts`

```typescript
export function useMultiWindowSupport() {
  const windowWidth = useWindowDimensions().width;
  const isTablet = useIsTablet();

  // Minimum width for multi-window: 1024px
  const supportsMultiWindow = windowWidth >= 1024 && isTablet;

  // Maximum sessions based on width
  const maxSessions = Math.floor(windowWidth / 600);

  return { supportsMultiWindow, maxSessions };
}
```

### Phase 3: State & Routing (2-3 days)

**Goal:** Support multiple active sessions in state and routing

#### 3.1 Extend Zustand Store

**Update:** `/sources/sync/storage.ts`

```typescript
interface StorageState {
  // ... existing fields ...

  // New: Multi-window support
  activeSessionIds: string[]; // Array of currently visible sessions
  windowLayout: LayoutMode;
  windowSizes: number[]; // Saved split sizes
}

// New actions
interface StorageActions {
  // ... existing actions ...

  addActiveSession: (sessionId: string) => void;
  removeActiveSession: (sessionId: string) => void;
  setWindowLayout: (layout: LayoutMode) => void;
  setWindowSizes: (sizes: number[]) => void;
  clearMultiWindow: () => void;
}
```

#### 3.2 Add Multi-Window Routes

**New File:** `/app/(app)/multi/[...sessions].tsx`

```typescript
import { useLocalSearchParams } from 'expo-router';

export default function MultiSessionView() {
  const { sessions } = useLocalSearchParams<{ sessions: string[] }>();
  const sessionIds = Array.isArray(sessions) ? sessions : [sessions];

  const layout = useStorage(state => state.windowLayout);

  return (
    <MultiWindowLayout
      sessions={sessionIds}
      layout={layout}
      onLayoutChange={setWindowLayout}
      onSessionClose={removeActiveSession}
    />
  );
}
```

**URL Examples:**
- `/multi/session1/session2` - Two sessions in split view
- `/multi/session1/session2/session3` - Three sessions in grid
- `/split?ids=abc,def&layout=horizontal` - Alternative query param approach

#### 3.3 Preserve Single-Session Routes

Keep existing routes working:
- `/session/[id]` - Single session (current behavior)
- `/` - Main view with sidebar (current behavior)

Add navigation helpers to switch between single and multi-window modes.

### Phase 4: User Experience Polish (3-5 days)

**Goal:** Make multi-window feel natural and productive

#### 4.1 Focus Management

```typescript
// Track which window has focus for keyboard shortcuts
const [focusedWindowId, setFocusedWindowId] = useState<string | null>(null);

// Keyboard shortcuts
useKeyboardShortcuts({
  'cmd+1': () => focusWindow(windowIds[0]),
  'cmd+2': () => focusWindow(windowIds[1]),
  'cmd+w': () => closeActiveWindow(),
  'cmd+shift+\\': () => toggleSplitOrientation(),
});
```

#### 4.2 Drag-and-Drop Session Management

```typescript
// Allow dragging sessions from sidebar into split view
function SidebarSessionItem({ session }: { session: Session }) {
  const { attributes, listeners } = useDraggable({
    id: session.id,
    data: { type: 'session', sessionId: session.id }
  });

  return (
    <View {...attributes} {...listeners}>
      {/* Session item */}
    </View>
  );
}

// Drop zones in split view
function DropZone({ position }: { position: 'left' | 'right' }) {
  const { setNodeRef } = useDroppable({
    id: `drop-zone-${position}`,
    data: { position }
  });

  return <View ref={setNodeRef} />;
}
```

#### 4.3 Layout Persistence

```typescript
// Save layout preferences to local storage
useEffect(() => {
  const savedLayout = localStorage.getItem('multiWindowLayout');
  if (savedLayout) {
    const { sessions, layout, sizes } = JSON.parse(savedLayout);
    // Restore layout
  }
}, []);

// Auto-save on changes
useEffect(() => {
  const layoutState = {
    sessions: activeSessionIds,
    layout: windowLayout,
    sizes: windowSizes,
  };
  localStorage.setItem('multiWindowLayout', JSON.stringify(layoutState));
}, [activeSessionIds, windowLayout, windowSizes]);
```

#### 4.4 Responsive Behavior

```typescript
// Auto-collapse to single view on small screens
const { supportsMultiWindow, maxSessions } = useMultiWindowSupport();

useEffect(() => {
  if (!supportsMultiWindow && activeSessionIds.length > 1) {
    // Show notification: "Multi-window requires larger screen"
    // Keep only first session active
    setActiveSessionIds([activeSessionIds[0]]);
  }
}, [supportsMultiWindow, activeSessionIds]);
```

#### 4.5 Visual Indicators

- **Active Window:** Subtle border or shadow around focused window
- **Layout Switcher:** Quick toggle button (grid icon) to switch layouts
- **Window Titles:** Show abbreviated session name in each window header
- **Close Buttons:** X button on each window header (except last window)
- **Resize Handles:** Clear visual affordance for draggable dividers

## User Flows

### Flow 1: Open Session in Split View

1. User is viewing Session A
2. User clicks "Open in Split" button on Session B in sidebar
3. Layout switches to split-horizontal
4. Session A on left, Session B on right
5. User can resize by dragging divider

### Flow 2: Drag Session to Split

1. User viewing Session A
2. User drags Session B from sidebar
3. Drop zones appear (left/right/top/bottom)
4. User drops on right zone
5. Split view created with Session B on right

### Flow 3: Keyboard Navigation

1. User has 2 sessions open in split view
2. Presses `Cmd+2` to focus right window
3. Types message in right window input
4. Presses `Cmd+1` to focus left window
5. Scrolls through messages in left window

### Flow 4: Layout Switching

1. User has 2 sessions in horizontal split
2. Clicks layout switcher icon
3. Menu shows: Horizontal / Vertical / Grid / Single
4. Selects Vertical
5. Layout changes to vertical split

## Technical Considerations

### Performance

- **Virtualization:** ChatList already uses FlatList for efficient rendering
- **Lazy Loading:** Only render visible windows in DOM
- **Memory:** Monitor memory usage with multiple SessionView instances
- **Message Limits:** Consider limiting message history in multi-window mode

### Accessibility

- **Keyboard Navigation:** Full keyboard support for window management
- **Screen Readers:** Announce active window changes
- **Focus Trapping:** Proper focus management when switching windows
- **ARIA Labels:** Clear labels for window controls

### Platform Considerations

- **Web Only (Initial):** Launch multi-window on web first
- **Desktop (macOS Tauri):** Enable after web validation
- **Mobile:** Single session only (screen too small)
- **Tablet:** Optional 2-window split on iPad Pro size devices

### Edge Cases

1. **Session Deletion:** If active session deleted, remove from multi-window
2. **Offline Mode:** Handle disconnections gracefully per window
3. **Encryption:** Each window handles its own message decryption
4. **Voice Assistant:** Only one window can use voice at a time
5. **File Uploads:** Track which window initiated file upload

## Alternative Approaches Considered

### 1. Browser Tabs/Windows (Rejected)
- **Pros:** No code changes needed, users can already open multiple tabs
- **Cons:** State not shared, poor UX for power users, loses integrated feel

### 2. Floating Windows (Rejected)
- **Pros:** Maximum flexibility, familiar pattern
- **Cons:** Complex to implement in React Native, hard to manage on web

### 3. Tab-Based Multi-Session (Alternative)
- **Pros:** Simpler than split view, familiar pattern
- **Cons:** Only one session visible at a time, defeats purpose

### 4. Picture-in-Picture Mode (Future)
- **Pros:** Minimal screen space, keeps context visible
- **Cons:** Limited interaction, best for monitoring not active work

## Success Metrics

- **Adoption:** % of web users who use multi-window feature
- **Usage Patterns:** Average number of sessions open simultaneously
- **Performance:** Render time for multi-window layout vs single session
- **Retention:** Do multi-window users have higher retention?
- **Feedback:** User satisfaction ratings for multi-window feature

## Rollout Plan

### Phase 1: Internal Beta (Week 1-2)
- Implement core functionality (Phases 1-3)
- Enable for internal team via feature flag
- Gather feedback on basic UX

### Phase 2: Polish & Refinement (Week 2-3)
- Implement Phase 4 polish features
- Fix bugs and UX issues
- Performance testing with 2-4 sessions

### Phase 3: Public Beta (Week 3-4)
- Enable for beta users on web
- Monitor performance and error rates
- Iterate based on feedback

### Phase 4: General Availability (Week 4+)
- Enable for all web users
- Update documentation
- Consider desktop (Tauri) support

## Open Questions

1. **Maximum Sessions:** Limit to 2, 3, or 4 simultaneous sessions?
2. **Default Layout:** What should default split orientation be?
3. **Session Persistence:** Remember multi-window layout across app restarts?
4. **Tablet Support:** Enable on iPad Pro? What's minimum screen size?
5. **Keyboard Shortcuts:** Use standard shortcuts or custom?
6. **Premium Feature:** Should multi-window be premium-only?

## References

### Existing Code Patterns
- Sidebar layout: `/sources/components/SidebarNavigator.tsx`
- Responsive utilities: `/sources/utils/responsive.ts`
- Session view: `/sources/-session/SessionView.tsx`
- Zustand store: `/sources/sync/storage.ts`

### Similar Features in Other Apps
- **VSCode:** Split editor, drag tabs to split
- **Slack:** Multiple workspace windows
- **Discord:** Pop-out channel windows
- **Linear:** Split view for issues
- **Cursor:** Multi-panel editor

## Conclusion

Implementing multi-window chat view in Happy is **medium difficulty** with an estimated effort of **1-2 weeks**. The existing architecture provides a solid foundation (Zustand state, reusable components, responsive system), but requires careful refactoring to support multiple simultaneous sessions.

The primary challenges are:
1. Decoupling SessionView from single-instance assumptions
2. Managing multiple input focus states
3. Building flexible layout components
4. Handling responsive behavior gracefully

The phased approach allows for iterative development with early feedback, minimizing risk while delivering a high-value feature for power users on larger screens.

---

**Next Steps:**
1. Review and approve proposal
2. Create detailed task breakdown
3. Assign Phase 1 implementation
4. Design visual mockups for layout switcher UI
