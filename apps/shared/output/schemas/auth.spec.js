import { describe, expect, it } from "vitest";
import { logoutSchema, registerUserSchema } from "./auth.js";
const baseUser = {
  email: "teacher@example.sch.id",
  password: "StrongPass123!",
  fullName: "Teacher Example",
  role: "TEACHER",
};
describe("registerUserSchema", () => {
  it("accepts payloads that satisfy the password policy", () => {
    const result = registerUserSchema.parse(baseUser);
    expect(result).toMatchObject({
      email: "teacher@example.sch.id",
      fullName: "Teacher Example",
      role: "TEACHER",
    });
  });
  it("rejects passwords that do not meet complexity requirements", () => {
    const result = registerUserSchema.safeParse({
      ...baseUser,
      password: "nouppercase1!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Password must");
    }
  });
});
describe("logoutSchema", () => {
  it("requires a refresh token, jti, or the all flag", () => {
    const result = logoutSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ["refreshToken"],
        message: "Provide refreshToken, jti, or set all to true",
      });
    }
  });
  it("accepts payloads with only a refresh token", () => {
    const result = logoutSchema.parse({ refreshToken: "refresh-token-123" });
    expect(result.refreshToken).toBe("refresh-token-123");
    expect(result.all).toBe(false);
  });
  it("accepts payloads with only a jti", () => {
    const result = logoutSchema.parse({ jti: "token-identifier" });
    expect(result.jti).toBe("token-identifier");
  });
  it("accepts payloads that revoke all tokens", () => {
    const result = logoutSchema.parse({ all: true });
    expect(result.all).toBe(true);
  });
});
