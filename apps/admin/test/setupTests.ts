import { beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import handlers from "../src/mocks/handlers";
// The `/vitest` entrypoint registers the matchers on vitest's `expect` and
// augments its Assertion interface. The bare import only declares Jest globals,
// which left `toBeInTheDocument` untyped even though it worked at runtime.
import "@testing-library/jest-dom/vitest";

// Create an MSW server with the same handlers used by the browser mocks.
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export { server };
