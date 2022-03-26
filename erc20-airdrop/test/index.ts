import {ethers} from "hardhat";
import {shouldBehaveLikeOwnable} from "./behaviors/Ownable.behavior";
import {shouldBehaveLikePausable} from "./behaviors/Pausable.behavior";
import {shouldBehaveLikeMerkleAirdrop} from "./behaviors/TEAMerkleDistributor.behavior";


describe("TEAMerkleAirdrop Unit Test", function () {
    beforeEach(async () => {
        this.ctx.signers = await ethers.getSigners();
        const [owner] = this.ctx.signers;

        const TEAERC20 = await ethers.getContractFactory('TEAERC20', owner);
        this.ctx.teaToken = await TEAERC20.deploy('Theia Coin', 'TEA', 1e8);
        await this.ctx.teaToken.deployed();
    });

    shouldBehaveLikeOwnable();

    shouldBehaveLikePausable();

    shouldBehaveLikeMerkleAirdrop();
});