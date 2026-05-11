---
id: reducers-context-and-scaling-state
slug: /reducers-context-and-scaling-state
sidebar_position: 5
description: 'Scale state safely with useReducer, context splitting, and selector-like patterns.'
---

# Reducers, Context, and Scaling State

## When to Use `useReducer`

Use reducers when state transitions are complex, event-driven, or interdependent.

## Reducer Example

```tsx
type State = {
  items: string[];
  loading: boolean;
};

type Action =
  | { type: 'start' }
  | { type: 'loaded'; items: string[] }
  | { type: 'reset' };

const initialState: State = { items: [], loading: false };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'start':
      return { ...state, loading: true };
    case 'loaded':
      return { items: action.items, loading: false };
    case 'reset':
      return initialState;
  }
};
```

## Context Provider Pattern

```tsx
const AppStateContext = React.createContext<State | null>(null);
const AppDispatchContext = React.createContext<React.Dispatch<Action> | null>(null);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  return (
    <AppDispatchContext.Provider value={dispatch}>
      <AppStateContext.Provider value={state}>{children}</AppStateContext.Provider>
    </AppDispatchContext.Provider>
  );
};
```

## Scale Tips

1. Split read and dispatch contexts.
2. Keep reducer pure and deterministic.
3. Move async work to actions/hooks around reducer.
