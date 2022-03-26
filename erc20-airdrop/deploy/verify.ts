import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("verifyMA", "Deploy Merkle Airdrop Smart Contract")
    .addParam("contractaddr", "The deployed smart contract address")
    .addParam("tokenaddr", "The Token address")
    .addParam("merkleroot", "The Merkle Root Hash Value")
    .setAction(async function (taskArguments: TaskArguments, hre) {

        await hre.run("verify:verify", {
                address: taskArguments.contractaddr,
                constructorArguments: [
                    taskArguments.tokenaddr,
                    taskArguments.merkleroot
                ],
        });
    });