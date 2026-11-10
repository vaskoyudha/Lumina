/** @jest-environment node */
jest.mock("@/lib/auth/server-session", () => ({
  getSession: jest.fn(),
}));
jest.mock("@/lib/studio/access", () => ({
  isStudioAllowed: jest.fn(),
}));

import { POST } from "@/app/api/studio/chat/route";
import { getSession } from "@/lib/auth/server-session";
import { isStudioAllowed } from "@/lib/studio/access";

function request(body: unknown): Request {
  return new Request("http://localhost/api/studio/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/studio/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects an anonymous request", async () => {
    jest.mocked(getSession).mockResolvedValue(null);
    const response = await POST(request({ question: "halo" }));
    expect(response.status).toBe(401);
  });

  it("rejects an account outside the Studio allowlist", async () => {
    jest.mocked(getSession).mockResolvedValue({
      id: "user-1234",
      email: "user@example.com",
      name: "User",
      plan: "free",
    } as never);
    jest.mocked(isStudioAllowed).mockReturnValue(false);
    const response = await POST(request({ question: "halo" }));
    expect(response.status).toBe(403);
    expect(isStudioAllowed).toHaveBeenCalledWith("user-1234");
  });

  it("rejects an invalid body before running tools", async () => {
    jest.mocked(getSession).mockResolvedValue({
      id: "user-1234",
      email: "user@example.com",
      name: "User",
      plan: "free",
    } as never);
    jest.mocked(isStudioAllowed).mockReturnValue(true);
    const response = await POST(request({ question: "" }));
    expect(response.status).toBe(400);
  });
});
