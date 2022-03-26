import {expect} from "chai";
import {ethers} from "hardhat";
import {BigNumber, Contract} from 'ethers';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import BalanceTree from "../../src/balance-tree";

export function shouldBehaveLikeOwnable(): void {
    describe("1. Ownable", async function() {
        let owner: SignerWithAddress;
        let addr1: SignerWithAddress;
        let addr2: SignerWithAddress;
        let merkleAirdrop: Contract;

        beforeEach(async () => {
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

        it("1.1 Succeeds when owner transfers ownership", async () => {

            await expect(merkleAirdrop.transferOwnership(addr1.address))
                .to.emit(merkleAirdrop, 'OwnershipTransferred')

        });


        it("1.2 Fails when non-owner transfers ownership", async () => {

            await merkleAirdrop.transferOwnership(addr1.address);

            await expect(merkleAirdrop.transferOwnership(addr2.address))
                .to.be.revertedWith('Ownable: caller is not the owner')
        });

    });
}
