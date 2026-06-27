import { describe, expect, it } from "vitest";
import { loadProposals, loadCharter, loadExpectedVerdicts, type ProposalsFixture, type SeedProposal } from "./fixtures";

describe("loadProposals", () => {
  let fixture: ProposalsFixture;

  it("loads without error", () => {
    fixture = loadProposals();
    expect(fixture).toBeDefined();
  });

  it("has treasury data", () => {
    fixture = loadProposals();
    expect(fixture.treasury.fundedCspr).toBe(66000);
    expect(fixture.treasury.fundedMotes).toBe("66000000000000");
  });

  it("has exactly 3 proposals", () => {
    fixture = loadProposals();
    expect(fixture.proposals).toHaveLength(3);
  });

  it("proposals have required fields", () => {
    fixture = loadProposals();
    for (const p of fixture.proposals) {
      expect(p.id).toBeTruthy();
      expect(p.title).toBeTruthy();
      expect(p.targetRef).toBeTruthy();
      expect(p.entrypoint).toBeTruthy();
      expect(typeof p.requestedAmountCspr).toBe("number");
      expect(p.requestedAmountMotes).toBeTruthy();
      expect(p.spice).toBeTruthy();
      expect(p.expectedVerdict).toBeTruthy();
    }
  });

  it("P1 is clean spice", () => {
    fixture = loadProposals();
    const p1 = fixture.proposals.find((p: SeedProposal) => p.id === "P1");
    expect(p1?.spice).toBe("clean");
    expect(p1?.expectedVerdict).toBe("APPROVE");
  });

  it("P2 is headline spice with cap", () => {
    fixture = loadProposals();
    const p2 = fixture.proposals.find((p: SeedProposal) => p.id === "P2");
    expect(p2?.spice).toBe("headline");
    expect(p2?.expectedVerdict).toBe("APPROVE_WITH_CONDITION");
    expect(p2?.expectedCapCspr).toBe(10000);
  });

  it("P3 is attack spice", () => {
    fixture = loadProposals();
    const p3 = fixture.proposals.find((p: SeedProposal) => p.id === "P3");
    expect(p3?.spice).toBe("attack");
    expect(p3?.expectedVerdict).toBe("REJECT");
  });
});

describe("loadCharter", () => {
  it("loads without error", () => {
    const charter = loadCharter();
    expect(charter.length).toBeGreaterThan(0);
  });

  it("contains §1 through §5", () => {
    const charter = loadCharter();
    for (let i = 1; i <= 5; i++) {
      expect(charter).toContain(`§${i}`);
    }
  });

  it("contains the 10,000 CSPR discretionary cap", () => {
    const charter = loadCharter();
    expect(charter).toContain("10,000 CSPR");
  });

  it("contains the 25% concentration limit", () => {
    const charter = loadCharter();
    expect(charter).toContain("25%");
  });

  it("lists grantee-aurora as pre-approved", () => {
    const charter = loadCharter();
    expect(charter).toContain("grantee-aurora");
  });
});

describe("loadExpectedVerdicts", () => {
  it("loads without error", () => {
    const verdicts = loadExpectedVerdicts();
    expect(verdicts).toBeDefined();
  });

  it("has entries for P1, P2, P3", () => {
    const verdicts = loadExpectedVerdicts();
    expect(verdicts).toHaveProperty("P1");
    expect(verdicts).toHaveProperty("P2");
    expect(verdicts).toHaveProperty("P3");
  });
});
