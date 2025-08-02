// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/LiskEscrow.sol";

contract DeployEscrowScript is Script {
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Use the existing relayer as trusted forwarder
        address trustedForwarder = 0x8d5c7363c174794Aa5E0d527e02f85E000a25aDA;
        console.log("Using trusted forwarder (relayer):", trustedForwarder);
        
        // Deploy LiskEscrow with meta-transaction support
        LiskEscrow escrow = new LiskEscrow(trustedForwarder);
        console.log("LiskEscrow deployed at:", address(escrow));
        
        vm.stopBroadcast();
        
        // Log summary
        console.log("\n=== Deployment Summary ===");
        console.log("LiskEscrow:", address(escrow));
        console.log("Trusted Forwarder:", trustedForwarder);
        console.log("=========================\n");
        console.log("\nNEXT STEPS:");
        console.log("1. Update relayer's escrow contract address");
        console.log("2. Update frontend escrow contract address");
        console.log("3. Update Ponder indexer contract address");
    }
}