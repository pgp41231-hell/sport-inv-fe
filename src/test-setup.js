import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount between tests so a component's timers and effects cannot leak into
// the next one — the hold countdown in particular runs an interval.
afterEach(cleanup);
