# ADR 0002: Use Zustand for Frontend State Management

**Date:** 2026-05-27
**Status:** Accepted

## Context
The FinPulse frontend is a React 19 application built with Vite. We require a state management solution that can handle high-frequency updates from WebSockets (market ticks) and standard application state (authentication token, user session, portfolio) without causing unnecessary re-renders or excessive boilerplate.

## Decision
We will use **Zustand** instead of Redux, MobX, or Context API.

## Consequences
### Positive
- **Boilerplate Reduction**: No need for complex reducers, actions, and dispatchers. State can be mutated cleanly.
- **Performance**: Transient updates (like high-frequency market data) can be managed with optimized selectors, reducing React render cycles.
- **Hooks-First**: Seamlessly integrates with React functional components.

### Negative
- **Ecosystem**: Smaller ecosystem of middlewares compared to Redux, though sufficient for our needs.
