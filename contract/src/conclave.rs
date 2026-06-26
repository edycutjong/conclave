//! Conclave — the minimal on-chain governance object for the Vouch agentic council.
//!
//! Off-chain, a council of AI agents (Risk / Treasury / Legal) deliberates over a
//! proposal and an Arbiter reaches a verdict. This contract is the **accountable
//! ledger + threshold-guarded executor** for that decision:
//!
//!   submit_proposal → record_verdict → approve (×quorum) → [human veto window] → execute
//!
//! `execute` performs the council-approved (possibly *capped*) treasury transfer and
//! emits an immutable `Decided` event carrying the transcript hash. Intelligence lives
//! in the agent layer; the chain only holds the record and enforces the guards.

use odra::casper_types::U512;
use odra::prelude::*;

/// Proposal lifecycle, stored as a `u8` (Odra storage stays primitive on purpose).
pub const STATUS_PENDING: u8 = 0;
pub const STATUS_DECIDED: u8 = 1;
pub const STATUS_EXECUTED: u8 = 2;
pub const STATUS_VETOED: u8 = 3;

/// All the ways a call can be rejected on-chain.
#[odra::odra_error]
pub enum Error {
    /// Caller is not the contract owner (the council orchestrator key).
    NotOwner = 1,
    /// Caller is neither guardian nor owner (veto is human-gated).
    NotGuardian = 2,
    /// No proposal exists for the given id.
    UnknownProposal = 3,
    /// A verdict was already recorded for this proposal.
    AlreadyDecided = 4,
    /// The proposal has no recorded verdict yet.
    NotDecided = 5,
    /// The proposal was already executed.
    AlreadyExecuted = 6,
    /// The proposal was vetoed and is permanently locked.
    Vetoed = 7,
    /// Fewer than `quorum` approvals were collected.
    QuorumNotReached = 8,
    /// This signer has already approved this proposal.
    AlreadyApproved = 9,
    /// The contract treasury cannot cover the approved transfer.
    InsufficientTreasury = 10,
    /// The verdict approved a zero transfer (e.g. a REJECT) — nothing to execute.
    ZeroApprovedAmount = 11,
}

/// Emitted when a decided, approved, non-vetoed proposal is executed.
#[odra::event]
pub struct Decided {
    pub proposal_id: u64,
    pub verdict: String,
    pub confidence_bps: u32,
    pub approved_amount: U512,
    pub transcript_hash: String,
}

/// Emitted each time a council signer's approval is collected on-chain.
#[odra::event]
pub struct Approved {
    pub proposal_id: u64,
    pub approver: Address,
    pub approvals: u32,
}

/// Emitted when a guardian/owner vetoes a proposal (the human kill-switch).
#[odra::event]
pub struct VetoCast {
    pub proposal_id: u64,
}

#[odra::module(events = [Decided, Approved, VetoCast])]
pub struct Conclave {
    owner: Var<Address>,
    guardian: Var<Address>,
    quorum: Var<u32>,
    count: Var<u64>,
    // --- proposal record (keyed by id) ---
    target: Mapping<u64, Address>,
    entrypoint: Mapping<u64, String>,
    args_hash: Mapping<u64, String>,
    rationale_hash: Mapping<u64, String>,
    requested_amount: Mapping<u64, U512>,
    proposer: Mapping<u64, Address>,
    status: Mapping<u64, u8>,
    // --- council verdict ---
    verdict: Mapping<u64, String>,
    confidence_bps: Mapping<u64, u32>,
    transcript_hash: Mapping<u64, String>,
    approved_amount: Mapping<u64, U512>,
    // --- on-chain multisig collection ---
    approvals: Mapping<u64, u32>,
    approvers: Mapping<u64, Vec<Address>>,
}

#[odra::module]
impl Conclave {
    /// Deploy with the approval `quorum` and the `guardian` who can veto.
    /// The deployer becomes `owner` (the council orchestrator key).
    pub fn init(&mut self, quorum: u32, guardian: Address) {
        self.owner.set(self.env().caller());
        self.guardian.set(guardian);
        self.quorum.set(quorum);
        self.count.set(0);
    }

    /// Fund the governance treasury. Attached CSPR is credited to the contract purse.
    #[odra(payable)]
    pub fn deposit(&mut self) {}

    /// Record a new proposal. `requested_amount` (motes) is what the proposal asks to
    /// move; the council may approve a smaller amount via `record_verdict`. Returns the id.
    pub fn submit_proposal(
        &mut self,
        target: Address,
        entrypoint: String,
        args_hash: String,
        rationale_hash: String,
        requested_amount: U512,
    ) -> u64 {
        let id = self.count.get_or_default();
        self.target.set(&id, target);
        self.entrypoint.set(&id, entrypoint);
        self.args_hash.set(&id, args_hash);
        self.rationale_hash.set(&id, rationale_hash);
        self.requested_amount.set(&id, requested_amount);
        self.proposer.set(&id, self.env().caller());
        self.status.set(&id, STATUS_PENDING);
        self.approvals.set(&id, 0);
        self.count.set(id + 1);
        id
    }

    /// Owner-only: record the council's verdict. `approved_amount` is the (possibly
    /// capped) transfer `execute` will perform — set it to 0 for a REJECT.
    pub fn record_verdict(
        &mut self,
        proposal_id: u64,
        verdict: String,
        confidence_bps: u32,
        transcript_hash: String,
        approved_amount: U512,
    ) {
        self.assert_owner();
        self.assert_exists(proposal_id);
        if self.status_of(proposal_id) != STATUS_PENDING {
            self.env().revert(Error::AlreadyDecided);
        }
        self.verdict.set(&proposal_id, verdict);
        self.confidence_bps.set(&proposal_id, confidence_bps);
        self.transcript_hash.set(&proposal_id, transcript_hash);
        self.approved_amount.set(&proposal_id, approved_amount);
        self.status.set(&proposal_id, STATUS_DECIDED);
    }

    /// Collect one council signer's approval on-chain (idempotent per signer).
    pub fn approve(&mut self, proposal_id: u64) {
        self.assert_exists(proposal_id);
        let status = self.status_of(proposal_id);
        if status == STATUS_VETOED {
            self.env().revert(Error::Vetoed);
        }
        if status == STATUS_EXECUTED {
            self.env().revert(Error::AlreadyExecuted);
        }
        let caller = self.env().caller();
        let mut approvers = self.approvers.get_or_default(&proposal_id);
        if approvers.contains(&caller) {
            self.env().revert(Error::AlreadyApproved);
        }
        approvers.push(caller);
        let count = approvers.len() as u32;
        self.approvers.set(&proposal_id, approvers);
        self.approvals.set(&proposal_id, count);
        self.env().emit_event(Approved {
            proposal_id,
            approver: caller,
            approvals: count,
        });
    }

    /// Guardian/owner-only: veto a proposal, permanently locking execution.
    pub fn veto(&mut self, proposal_id: u64) {
        self.assert_guardian();
        self.assert_exists(proposal_id);
        if self.status_of(proposal_id) == STATUS_EXECUTED {
            self.env().revert(Error::AlreadyExecuted);
        }
        self.status.set(&proposal_id, STATUS_VETOED);
        self.env().emit_event(VetoCast { proposal_id });
    }

    /// Execute a decided, approved, non-vetoed proposal: transfer the approved amount
    /// from the treasury to the target and emit `Decided` with the transcript hash.
    pub fn execute(&mut self, proposal_id: u64) {
        self.assert_exists(proposal_id);
        match self.status_of(proposal_id) {
            STATUS_VETOED => self.env().revert(Error::Vetoed),
            STATUS_EXECUTED => self.env().revert(Error::AlreadyExecuted),
            STATUS_DECIDED => {}
            _ => self.env().revert(Error::NotDecided),
        }
        if self.approvals.get_or_default(&proposal_id) < self.quorum.get_or_default() {
            self.env().revert(Error::QuorumNotReached);
        }
        let amount = self.approved_amount.get_or_default(&proposal_id);
        if amount.is_zero() {
            self.env().revert(Error::ZeroApprovedAmount);
        }
        if self.env().self_balance() < amount {
            self.env().revert(Error::InsufficientTreasury);
        }
        let target = self.target.get(&proposal_id).unwrap_or_revert(&self.env());
        self.env().transfer_tokens(&target, &amount);
        self.status.set(&proposal_id, STATUS_EXECUTED);
        self.env().emit_event(Decided {
            proposal_id,
            verdict: self.verdict.get(&proposal_id).unwrap_or_default(),
            confidence_bps: self.confidence_bps.get_or_default(&proposal_id),
            approved_amount: amount,
            transcript_hash: self.transcript_hash.get(&proposal_id).unwrap_or_default(),
        });
    }

    // ----- views -----

    pub fn get_status(&self, proposal_id: u64) -> u8 {
        self.status_of(proposal_id)
    }

    pub fn get_target(&self, proposal_id: u64) -> Option<Address> {
        self.target.get(&proposal_id)
    }

    pub fn get_verdict(&self, proposal_id: u64) -> String {
        self.verdict.get(&proposal_id).unwrap_or_default()
    }

    pub fn get_confidence(&self, proposal_id: u64) -> u32 {
        self.confidence_bps.get_or_default(&proposal_id)
    }

    pub fn get_transcript_hash(&self, proposal_id: u64) -> String {
        self.transcript_hash.get(&proposal_id).unwrap_or_default()
    }

    pub fn get_approved_amount(&self, proposal_id: u64) -> U512 {
        self.approved_amount.get_or_default(&proposal_id)
    }

    pub fn get_requested_amount(&self, proposal_id: u64) -> U512 {
        self.requested_amount.get_or_default(&proposal_id)
    }

    pub fn get_approvals(&self, proposal_id: u64) -> u32 {
        self.approvals.get_or_default(&proposal_id)
    }

    pub fn get_quorum(&self) -> u32 {
        self.quorum.get_or_default()
    }

    pub fn get_count(&self) -> u64 {
        self.count.get_or_default()
    }

    pub fn treasury_balance(&self) -> U512 {
        self.env().self_balance()
    }

    // ----- internal guards -----

    fn status_of(&self, proposal_id: u64) -> u8 {
        self.status.get_or_default(&proposal_id)
    }

    fn assert_exists(&self, proposal_id: u64) {
        if proposal_id >= self.count.get_or_default() {
            self.env().revert(Error::UnknownProposal);
        }
    }

    fn assert_owner(&self) {
        if self.env().caller() != self.owner.get().unwrap_or_revert(&self.env()) {
            self.env().revert(Error::NotOwner);
        }
    }

    fn assert_guardian(&self) {
        let caller = self.env().caller();
        let is_guardian = self.guardian.get().map(|g| g == caller).unwrap_or(false);
        let is_owner = self.owner.get().map(|o| o == caller).unwrap_or(false);
        if !is_guardian && !is_owner {
            self.env().revert(Error::NotGuardian);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostRef};

    const QUORUM: u32 = 2;

    fn setup() -> (odra::host::HostEnv, ConclaveHostRef) {
        let env = odra_test::env();
        let guardian = env.get_account(1);
        let contract = Conclave::deploy(
            &env,
            ConclaveInitArgs {
                quorum: QUORUM,
                guardian,
            },
        );
        (env, contract)
    }

    /// Submit a funded "transfer to vendor" proposal and return its id.
    fn submit(env: &odra::host::HostEnv, c: &mut ConclaveHostRef, requested: u64) -> u64 {
        let target = env.get_account(3);
        c.submit_proposal(
            target,
            "transfer".to_string(),
            "args-hash".to_string(),
            "rationale-hash".to_string(),
            U512::from(requested),
        )
    }

    fn decide(c: &mut ConclaveHostRef, id: u64, approved: u64) {
        c.record_verdict(
            id,
            "APPROVE-WITH-CONDITION".to_string(),
            6200,
            "transcript-hash".to_string(),
            U512::from(approved),
        );
    }

    fn approve_to_quorum(env: &odra::host::HostEnv, c: &mut ConclaveHostRef, id: u64) {
        for i in 4..(4 + QUORUM as usize) {
            env.set_caller(env.get_account(i));
            c.approve(id);
        }
        env.set_caller(env.get_account(0));
    }

    #[test]
    fn happy_path_executes_capped_transfer() {
        let (env, mut c) = setup();
        c.with_tokens(U512::from(50_000u64)).deposit();
        let id = submit(&env, &mut c, 25_000);
        decide(&mut c, id, 10_000); // council caps 25k → 10k
        approve_to_quorum(&env, &mut c, id);

        let target = env.get_account(3);
        let before = env.balance_of(&target);
        c.execute(id);
        let after = env.balance_of(&target);

        assert_eq!(c.get_status(id), STATUS_EXECUTED);
        assert_eq!(after - before, U512::from(10_000u64));
        assert_eq!(c.get_approved_amount(id), U512::from(10_000u64));
    }

    #[test]
    fn veto_locks_execution() {
        let (env, mut c) = setup();
        c.with_tokens(U512::from(50_000u64)).deposit();
        let id = submit(&env, &mut c, 25_000);
        decide(&mut c, id, 10_000);
        approve_to_quorum(&env, &mut c, id);

        c.veto(id); // owner can veto
        assert_eq!(c.get_status(id), STATUS_VETOED);
        assert_eq!(c.try_execute(id), Err(Error::Vetoed.into()));
    }

    #[test]
    fn double_execute_is_blocked() {
        let (env, mut c) = setup();
        c.with_tokens(U512::from(50_000u64)).deposit();
        let id = submit(&env, &mut c, 25_000);
        decide(&mut c, id, 10_000);
        approve_to_quorum(&env, &mut c, id);
        c.execute(id);
        assert_eq!(c.try_execute(id), Err(Error::AlreadyExecuted.into()));
    }

    #[test]
    fn execute_requires_quorum() {
        let (env, mut c) = setup();
        c.with_tokens(U512::from(50_000u64)).deposit();
        let id = submit(&env, &mut c, 25_000);
        decide(&mut c, id, 10_000);
        // only one approval (< quorum)
        env.set_caller(env.get_account(4));
        c.approve(id);
        env.set_caller(env.get_account(0));
        assert_eq!(c.try_execute(id), Err(Error::QuorumNotReached.into()));
    }

    #[test]
    fn reject_verdict_cannot_execute() {
        let (env, mut c) = setup();
        c.with_tokens(U512::from(50_000u64)).deposit();
        let id = submit(&env, &mut c, 25_000);
        decide(&mut c, id, 0); // REJECT → approved amount 0
        approve_to_quorum(&env, &mut c, id);
        assert_eq!(c.try_execute(id), Err(Error::ZeroApprovedAmount.into()));
    }

    #[test]
    fn approval_is_deduplicated_per_signer() {
        let (env, mut c) = setup();
        let id = submit(&env, &mut c, 25_000);
        decide(&mut c, id, 10_000);
        env.set_caller(env.get_account(4));
        c.approve(id);
        assert_eq!(c.try_approve(id), Err(Error::AlreadyApproved.into()));
        assert_eq!(c.get_approvals(id), 1);
    }

    #[test]
    fn only_owner_records_verdict() {
        let (env, mut c) = setup();
        let id = submit(&env, &mut c, 25_000);
        env.set_caller(env.get_account(5));
        let res = c.try_record_verdict(
            id,
            "APPROVE".to_string(),
            9000,
            "h".to_string(),
            U512::from(1u64),
        );
        assert_eq!(res, Err(Error::NotOwner.into()));
    }

    #[test]
    fn execute_without_verdict_is_blocked() {
        let (env, mut c) = setup();
        let id = submit(&env, &mut c, 25_000);
        assert_eq!(c.try_execute(id), Err(Error::NotDecided.into()));
    }

    #[test]
    fn unknown_proposal_reverts() {
        let (_env, mut c) = setup();
        assert_eq!(c.try_execute(999), Err(Error::UnknownProposal.into()));
    }

    #[test]
    fn record_verdict_already_decided_reverts() {
        let (env, mut c) = setup();
        let id = submit(&env, &mut c, 25_000);
        decide(&mut c, id, 10_000);
        
        // Record verdict again on decided proposal
        let res = c.try_record_verdict(
            id,
            "APPROVE".to_string(),
            9000,
            "h".to_string(),
            U512::from(10_000u64),
        );
        assert_eq!(res, Err(Error::AlreadyDecided.into()));
    }

    #[test]
    fn approve_vetoed_or_executed_reverts() {
        let (env, mut c) = setup();
        c.with_tokens(U512::from(50_000u64)).deposit();
        let id = submit(&env, &mut c, 25_000);
        decide(&mut c, id, 10_000);
        
        // Test vetoed reverting approve
        c.veto(id);
        assert_eq!(c.try_approve(id), Err(Error::Vetoed.into()));

        // Test executed reverting approve
        let id2 = submit(&env, &mut c, 5_000);
        decide(&mut c, id2, 5_000);
        approve_to_quorum(&env, &mut c, id2);
        c.execute(id2);
        assert_eq!(c.try_approve(id2), Err(Error::AlreadyExecuted.into()));
    }

    #[test]
    fn veto_executed_reverts() {
        let (env, mut c) = setup();
        c.with_tokens(U512::from(50_000u64)).deposit();
        let id = submit(&env, &mut c, 25_000);
        decide(&mut c, id, 10_000);
        approve_to_quorum(&env, &mut c, id);
        c.execute(id);
        
        assert_eq!(c.try_veto(id), Err(Error::AlreadyExecuted.into()));
    }

    #[test]
    fn execute_insufficient_treasury_reverts() {
        let (env, mut c) = setup();
        // Do not deposit tokens to the contract (treasury remains 0)
        let id = submit(&env, &mut c, 25_000);
        decide(&mut c, id, 10_000);
        approve_to_quorum(&env, &mut c, id);
        
        assert_eq!(c.try_execute(id), Err(Error::InsufficientTreasury.into()));
    }

    #[test]
    fn veto_unauthorized_reverts() {
        let (env, mut c) = setup();
        let id = submit(&env, &mut c, 25_000);
        
        // Set caller to account 5, which is neither owner (0) nor guardian (1)
        env.set_caller(env.get_account(5));
        assert_eq!(c.try_veto(id), Err(Error::NotGuardian.into()));
    }

    #[test]
    fn test_views_and_getters() {
        let (env, mut c) = setup();
        let id = submit(&env, &mut c, 25_000);
        decide(&mut c, id, 10_000);
        
        assert_eq!(c.get_target(id), Some(env.get_account(3)));
        assert_eq!(c.get_verdict(id), "APPROVE-WITH-CONDITION".to_string());
        assert_eq!(c.get_confidence(id), 6200);
        assert_eq!(c.get_transcript_hash(id), "transcript-hash".to_string());
        assert_eq!(c.get_requested_amount(id), U512::from(25_000u64));
        assert_eq!(c.get_quorum(), QUORUM);
        assert_eq!(c.get_count(), 1);
        assert_eq!(c.treasury_balance(), U512::zero());
        
        // Test non-existent target fallback
        assert_eq!(c.get_target(999), None);
    }
}
