//! Livenet deploy script for the Conclave governance contract.
//!
//! Deploys to Casper Testnet using the Odra livenet backend. Run:
//!   cargo run --bin conclave_livenet --features livenet
//!
//! Required env (see ../LIVE_TESTNET.md):
//!   ODRA_CASPER_LIVENET_SECRET_KEY_PATH  — PEM of a faucet-funded Testnet key
//!   ODRA_CASPER_LIVENET_NODE_ADDRESS     — e.g. https://node.testnet.cspr.cloud
//!   ODRA_CASPER_LIVENET_CHAIN_NAME       — casper-test
//!   ODRA_CASPER_LIVENET_EVENTS_URL       — e.g. https://node.testnet.cspr.cloud/events
//! Optional:
//!   CONCLAVE_QUORUM        — approval quorum (default 2)
//!   CONCLAVE_INSTALL_GAS   — install gas in motes (default 300 CSPR)

use conclave::conclave::{Conclave, ConclaveInitArgs};
use odra::casper_types::U512;
use odra::host::{Deployer, HostRef};
use odra::prelude::Addressable;

fn main() {
    let env = odra_casper_livenet_env::env();

    let install_gas: u64 = std::env::var("CONCLAVE_INSTALL_GAS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(300_000_000_000u64);

    let quorum: u32 = std::env::var("CONCLAVE_QUORUM")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(2);

    // The deployer becomes `owner`; the guardian (human veto key) defaults to the
    // deployer too. Set a distinct guardian in production by editing this line.
    let guardian = env.caller();

    env.set_gas(install_gas);
    let contract = Conclave::deploy(&env, ConclaveInitArgs { quorum, guardian });

    // Optionally fund the treasury at deploy time (the payable `deposit`). This is the
    // correct way to attach CSPR — casper-js-sdk's ContractCallBuilder cannot. `execute`
    // later transfers the approved amount out of this balance.
    if let Some(motes) = std::env::var("CONCLAVE_FUND_MOTES")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
    {
        env.set_gas(install_gas);
        contract.with_tokens(U512::from(motes)).deposit();
        println!("   treasury funded  : {motes} motes");
    }

    println!("✅ Conclave deployed to Casper Testnet");
    println!("   contract address : {:?}", contract.address());
    println!("   quorum           : {quorum}");
    println!("   owner = guardian : {:?}", guardian);
    println!();
    println!("Set CONCLAVE_CONTRACT_HASH in .env.local to the hash above (strip any prefix).");
}
