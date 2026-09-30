import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const currentUser = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ currentUser: () => currentUser() }));

const user = (emails: { emailAddress: string; verification?: { status: string } | null }[]) => ({ id: "user_1", emailAddresses: emails });

describe("getAdmin (admin page gate)", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "kmchmk@gmail.com, J.Natnicha@gmail.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    currentUser.mockReset();
  });

  it("allows both listed admins (case-insensitive, verified email)", async () => {
    const { getAdmin } = await import("./admin");
    currentUser.mockResolvedValue(user([{ emailAddress: "kmchmk@gmail.com", verification: { status: "verified" } }]));
    expect(await getAdmin()).toEqual({ id: "user_1", email: "kmchmk@gmail.com" });
    currentUser.mockResolvedValue(user([{ emailAddress: "j.natnicha@gmail.com", verification: { status: "verified" } }]));
    expect(await getAdmin()).toMatchObject({ email: "j.natnicha@gmail.com" });
  });

  it("rejects signed-out users and other accounts", async () => {
    const { getAdmin } = await import("./admin");
    currentUser.mockResolvedValue(null);
    expect(await getAdmin()).toBeNull();
    currentUser.mockResolvedValue(user([{ emailAddress: "someone@gmail.com", verification: { status: "verified" } }]));
    expect(await getAdmin()).toBeNull();
  });

  it("rejects an admin address that is not verified (can't be claimed by typing it in)", async () => {
    const { getAdmin } = await import("./admin");
    currentUser.mockResolvedValue(user([{ emailAddress: "kmchmk@gmail.com", verification: { status: "unverified" } }]));
    expect(await getAdmin()).toBeNull();
    currentUser.mockResolvedValue(user([{ emailAddress: "kmchmk@gmail.com", verification: null }]));
    expect(await getAdmin()).toBeNull();
  });

  it("nobody is admin when ADMIN_EMAILS is unset or empty", async () => {
    const { getAdmin } = await import("./admin");
    currentUser.mockResolvedValue(user([{ emailAddress: "kmchmk@gmail.com", verification: { status: "verified" } }]));
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(await getAdmin()).toBeNull();
    vi.stubEnv("ADMIN_EMAILS", " , ");
    expect(await getAdmin()).toBeNull();
  });
});
