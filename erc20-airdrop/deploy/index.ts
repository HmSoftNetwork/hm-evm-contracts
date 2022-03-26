import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("deployMA", "Deploy Merkle Airdrop Smart Contract")
    .addParam("tokenaddr", "The Token address")
    .addParam("merkleroot", "The Merkle Root Hash Value")
    .setAction(async function (taskArguments: TaskArguments, { ethers, network }) {
        /// Deploy CrowdFunding
        const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor');
        const distributor = await TEAMerkleDistributor.deploy(taskArguments.tokenaddr, taskArguments.merkleroot);
        await distributor.deployed();

        console.log("TEAMerkleAirdrop smart contract deployed to:", distributor.address);
    });