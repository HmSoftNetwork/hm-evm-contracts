import { expect } from "chai";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber, Contract} from "ethers";
import BalanceTree from "../../src/balance-tree";
import {ethers} from "hardhat";

export function shouldBehaveLikePausable(): void {
    describe("2. Pausable", async function() {
        let owner: SignerWithAddress;
        let addr1: SignerWithAddress;
        let addr2: SignerWithAddress;
        let merkleAirdrop: Contract;

        beforeEach(async () =>{
            [owner, addr1, addr2] = this.ctx.signers;

            // Create Merkle Tree
            const tree = new BalanceTree([
                { account: addr1.address, amount: BigNumber.from(100) },
                { account: addr2.address, amount: BigNumber.from(101) },
            ])

            const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
            merkleAirdrop = await TEAMerkleDistributor.deploy(this.ctx.teaToken.address, tree.getHexRoot());
            await merkleAirdrop.deployed();
        });


        it("2.1 Succeeds if owner pause when NOT paused", async () => {
            await expect(merkleAirdrop.pause())
                .to.emit(merkleAirdrop, 'Paused')
                .withArgs(owner.address);
        });


        it("2.2 Succeeds if owner unpause when already paused", async () => {
            await merkleAirdrop.pause();

            await expect(merkleAirdrop.unpause())
                .to.emit(merkleAirdrop, 'Unpaused')
                .withArgs(owner.address);
        });

        it("2.3 Fails if owner pause when already paused", async () => {
            await merkleAirdrop.pause();

            await expect(merkleAirdrop.pause())
                .to.be.revertedWith("Pausable: paused");
        });

        it("2.4 Fails if owner unpause when already unpaused", async () => {
            await merkleAirdrop.pause();

            await merkleAirdrop.unpause();

            await expect(merkleAirdrop.unpause())
                .to.be.revertedWith("Pausable: not paused");
        });

        it("2.5 Fails if non-owner pause when NOT paused", async () => {
            await expect(merkleAirdrop.connect(addr1).pause())
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("2.6 Fails if non-owner unpause when already paused", async () => {
            await merkleAirdrop.pause();

            await expect(merkleAirdrop.connect(addr1).unpause())
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
}
