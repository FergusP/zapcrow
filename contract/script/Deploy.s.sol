// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/LiskEscrow.sol";
import "../src/EscrowRelayer.sol";

contract DeployScript is Script {
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Use deployed IDRX token
        address idrx = 0xD63029C1a3dA68b51c67c6D1DeC3DEe50D681661;
        console.log("Using IDRX token at:", idrx);
        
        // 2. Deploy Relayer (temporary address, will update)
        address tempRelayer = address(0x1);
        
        // 3. Deploy LiskEscrow with relayer address
        LiskEscrow escrow = new LiskEscrow(tempRelayer);
        console.log("LiskEscrow deployed at:", address(escrow));
        
        // 4. Deploy actual Relayer with escrow address
        EscrowRelayer relayer = new EscrowRelayer(address(escrow));
        console.log("EscrowRelayer deployed at:", address(relayer));
        
        // 5. Update escrow's trusted forwarder to actual relayer
        escrow.updateTrustedForwarder(address(relayer));
        console.log("Updated trusted forwarder to:", address(relayer));
        
        // 6. Note: Relayer only needs ETH for gas fees
        // Users will handle IDRX token approvals/transfers
        
        vm.stopBroadcast();
        
        // Log summary
        console.log("\n=== Deployment Summary ===");
        console.log("IDRX Token:", idrx);
        console.log("LiskEscrow:", address(escrow));
        console.log("EscrowRelayer:", address(relayer));
        console.log("=========================\n");
    }
}