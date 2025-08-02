// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/LiskEscrowSimple.sol";

contract DeploySimpleScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy simple escrow contract (no meta-transactions)
        LiskEscrowSimple escrow = new LiskEscrowSimple();
        console.log("LiskEscrowSimple deployed at:", address(escrow));
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Summary ===");
        console.log("Simple Escrow Contract:", address(escrow));
        console.log("=========================\n");
        console.log("\nNEXT STEPS:");
        console.log("1. Update frontend contracts");
        console.log("2. Update Ponder indexer");
        console.log("3. Test with normal gas transactions");
    }
}