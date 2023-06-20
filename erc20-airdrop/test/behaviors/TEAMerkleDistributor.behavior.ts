import {expect} from 'chai'
import {ethers} from "hardhat";
import {BigNumber, constants, Contract} from 'ethers'
import BalanceTree from '../../src/balance-tree'
import BalanceMapManager from '../../src/parse-balance-map'
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

export function shouldBehaveLikeMerkleAirdrop(): void {
  describe('TEAMerkleDistributor', function () {
    let owner: SignerWithAddress;
    let wallet0: SignerWithAddress;
    let wallet1: SignerWithAddress;
    let wallet2: SignerWithAddress;
    let wallets: SignerWithAddress[];
    let token: Contract;

    beforeEach('deploy token', async () => {
      wallets = this.ctx.signers;
      [owner, wallet0, wallet1, wallet2] = wallets;
      token = this.ctx.teaToken;
    })

    describe('1. Add account', () => {
      let distributor: Contract
      let balanceMap: BalanceMapManager
      let claims: {
        [account: string]: {
          index: number
          amount: string
          proof: string[]
        }
      }

      beforeEach('deploy', async () => {
        balanceMap = new BalanceMapManager(
            {
              [wallet0.address]: 100,
              [wallet1.address]: 101
            });
        claims = balanceMap.merkleInfo.claims;
        const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
        distributor = await TEAMerkleDistributor.deploy(token.address, balanceMap.merkleInfo.merkleRoot);
        await distributor.deployed();

        await token.connect(owner).transfer(distributor.address, balanceMap.merkleInfo.tokenTotal);
      })

      describe('1) Succeeds when admin add valid address and non-zero claimable amount', () => {
        it('- Verify that the token balance is reduced by the non-zero claimable amount', async () => {
          // Get wallet0`s claim data
          const claim0 = claims[wallet0.address];
          expect(await distributor.getClaimableAmt(claim0.index, wallet0.address, claim0.amount, claim0.proof)).to.be.eq(BigNumber.from(100));

          const oldTokenTotal = Number(balanceMap.merkleInfo.tokenTotal);

          // Verify that the root hash is changed
          balanceMap.addNodes({[wallet2.address]: 102});
          await distributor.connect(owner).updateMerkleRoot(balanceMap.merkleInfo.merkleRoot);

          // Verify that the token owner balance is decreased by the non-zero claimable amount
          await token.connect(owner).transfer(distributor.address, Number(balanceMap.merkleInfo.tokenTotal) - oldTokenTotal);

          expect(await token.balanceOf(distributor.address)).to.gt(oldTokenTotal);
        });

        it('- Verify that the root hash is changed', async () => {
          // Get wallet0`s claim data
          const claim0 = claims[wallet0.address];
          expect(await distributor.getClaimableAmt(claim0.index, wallet0.address, claim0.amount, claim0.proof)).to.be.eq(BigNumber.from(100));

          const oldMerkleRoot = balanceMap.merkleInfo.merkleRoot;

          // Verify that the root hash is changed
          balanceMap.addNodes({[wallet2.address]: 102});
          await distributor.connect(owner).updateMerkleRoot(balanceMap.merkleInfo.merkleRoot);
          expect(await distributor.merkleRoot()).to.not.eq(oldMerkleRoot);
        });

        it('- Verify that the account is whitelisted', async () => {
          // Get wallet0`s claim data
          const claim0 = claims[wallet0.address];
          expect(await distributor.getClaimableAmt(claim0.index, wallet0.address, claim0.amount, claim0.proof)).to.be.eq(BigNumber.from(100));

          // Verify that the root hash is changed
          balanceMap.addNodes({[wallet2.address]: 102});
          await distributor.connect(owner).updateMerkleRoot(balanceMap.merkleInfo.merkleRoot);

          // Get new claims data
          const newClaims = balanceMap.merkleInfo.claims;

          // Verify that the account is whitelisted
          const claim2 = newClaims[wallet2.address];
          expect(await distributor.getClaimableAmt(claim2.index, wallet2.address, claim2.amount, claim2.proof)).to.be.eq(BigNumber.from(102));
        });
      });


      it('2) Fails when non-admin add valid address and non-zero claimable amount', async () => {
        // Get wallet0`s claim data
        const claim0 = claims[wallet0.address];
        expect(await distributor.getClaimableAmt(claim0.index, wallet0.address, claim0.amount, claim0.proof)).to.be.eq(BigNumber.from(100));

        balanceMap.addNodes({[wallet2.address]: 102});
        await expect(distributor.connect(wallets[9]).updateMerkleRoot(balanceMap.merkleInfo.merkleRoot)).to.revertedWith('Ownable: caller is not the owner');
      });

      it('3) Fails when admin add a valid address with zero claimable amount', async () => {
        try {
          balanceMap.addNodes({[wallet2.address]: 0})
        } catch (e) {
          return true;
        }
        throw('Not reverted');
      });

      it('4) Fails when admin add a zero address with non-zero claimable amount', async () => {
        try {
          balanceMap.addNodes({[ZERO_ADDRESS]: 102})
        } catch (e) {
          return true;
        }
        throw('Not reverted');
      })
    })

    describe('2. Remove account', () => {
      let distributor: Contract
      let balanceMap: BalanceMapManager
      let claims: {
        [account: string]: {
          index: number
          amount: string
          proof: string[]
        }
      }

      beforeEach('deploy', async () => {
        balanceMap = new BalanceMapManager(
            {
              [wallet0.address]: 100,
              [wallet1.address]: 101,
              [wallet2.address]: 102
            });
        claims = balanceMap.merkleInfo.claims;
        const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
        distributor = await TEAMerkleDistributor.deploy(token.address, balanceMap.merkleInfo.merkleRoot);
        await distributor.deployed();

        await token.connect(owner).transfer(distributor.address, balanceMap.merkleInfo.tokenTotal);
      })

      describe('1) Succeeds when admin remove an existing address with zero claimable amount', () => {
        it('- Verify that the root hash is changed', async () => {
          // Get wallet0`s claim data
          const claim2 = claims[wallet2.address];
          await distributor.connect(wallet2).claim(claim2.index, claim2.amount, claim2.amount, claim2.proof);
          expect(await distributor.getClaimableAmt(claim2.index, wallet2.address, claim2.amount, claim2.proof)).to.be.eq(BigNumber.from(0));

          const oldMerkleRoot = balanceMap.merkleInfo.merkleRoot;
          // Verify that the root hash is changed
          balanceMap.removeNodes([wallet2.address]);
          await distributor.connect(owner).updateMerkleRoot(balanceMap.merkleInfo.merkleRoot);
          expect(await distributor.merkleRoot()).to.not.eq(oldMerkleRoot);

          // After adding customer, customer can claim token
          const newClaims = balanceMap.merkleInfo.claims;
          expect(newClaims[wallet2.address]).to.eq(undefined);

          const newClaim0 = newClaims[wallet0.address];
          expect(await distributor.getClaimableAmt(newClaim0.index, wallet0.address, newClaim0.amount, newClaim0.proof)).to.be.eq(BigNumber.from(100));
        });
      });

      describe('1) Succeeds when admin remove an existing address with zero claimable amount', () => {

        it('- Verify that the token balance is reduced by the non-zero claimable amount', async () => {
          // Get wallet0`s claim data
          const claim2 = claims[wallet2.address];
          expect(await distributor.getClaimableAmt(claim2.index, wallet2.address, claim2.amount, claim2.proof)).to.be.eq(BigNumber.from(102));

          const oldTokenTotal = Number(balanceMap.merkleInfo.tokenTotal);

          balanceMap.removeNodes([wallet2.address]);
          await distributor.connect(owner).updateMerkleRoot(balanceMap.merkleInfo.merkleRoot);

          // withdraw the token amount of removed accounts
          await distributor.connect(owner).withdrawToken(oldTokenTotal - Number(balanceMap.merkleInfo.tokenTotal));

          // After adding customer, customer can claim token
          const newClaims = balanceMap.merkleInfo.claims;
          expect(newClaims[wallet2.address]).to.eq(undefined);

          const newClaim0 = newClaims[wallet0.address];
          expect(await distributor.getClaimableAmt(newClaim0.index, wallet0.address, newClaim0.amount, newClaim0.proof)).to.be.eq(BigNumber.from(100));

          // Verify that the token owner balance is increased by the non-zero claimable amount
          expect(await token.balanceOf(distributor.address)).to.lt(oldTokenTotal);
        });

        it('- Verify that the root hash is changed', async () => {
          // Get wallet0`s claim data
          const claim2 = claims[wallet2.address];
          expect(await distributor.getClaimableAmt(claim2.index, wallet2.address, claim2.amount, claim2.proof)).to.be.eq(BigNumber.from(102));

          const oldMerkleRoot = balanceMap.merkleInfo.merkleRoot;

          // Verify that the root hash is changed
          balanceMap.removeNodes([wallet2.address]);
          await distributor.connect(owner).updateMerkleRoot(balanceMap.merkleInfo.merkleRoot);
          expect(await distributor.merkleRoot()).to.not.eq(oldMerkleRoot);
        });
      });

      it('2) Fail when non-admin remove an existing address with zero claimable amount', async () => {
        const claim2 = claims[wallet2.address];
        await distributor.connect(wallet2).claim(claim2.index, claim2.amount, claim2.amount, claim2.proof);
        expect(await distributor.getClaimableAmt(claim2.index, wallet2.address, claim2.amount, claim2.proof)).to.be.eq(BigNumber.from(0));

        balanceMap.removeNodes([wallet2.address]);
        await expect(distributor.connect(wallets[9]).updateMerkleRoot(balanceMap.merkleInfo.merkleRoot)).to.revertedWith('Ownable: caller is not the owner');
      });

      it('3) Fails when non-admin remove an existing address with non-zero claimable amount', async () => {
        // Get wallet0`s claim data
        const claim2 = claims[wallet2.address];
        expect(await distributor.getClaimableAmt(claim2.index, wallet2.address, claim2.amount, claim2.proof)).to.be.eq(BigNumber.from(102));

        balanceMap.removeNodes([wallet2.address]);
        await expect(distributor.connect(wallets[9]).updateMerkleRoot(balanceMap.merkleInfo.merkleRoot)).to.revertedWith('Ownable: caller is not the owner');
      })

      it('4) Fails when admin remove a non-existing address', async () => {
        const oldMerkleRoot = balanceMap.merkleInfo.merkleRoot;
        balanceMap.removeNodes([wallets[9].address]);
        expect(balanceMap.merkleInfo.merkleRoot).to.be.eq(oldMerkleRoot);
      })

      it('5) Fails when admin remove a zero address', async () => {
        const oldMerkleRoot = balanceMap.merkleInfo.merkleRoot;
        balanceMap.removeNodes([ZERO_ADDRESS]);
        expect(balanceMap.merkleInfo.merkleRoot).to.be.eq(oldMerkleRoot);
      })
    })

    describe('3. Decrease amount', () => {
      let distributor: Contract
      let balanceMap: BalanceMapManager
      let claims: {
        [account: string]: {
          index: number
          amount: string
          proof: string[]
        }
      }

      beforeEach('deploy', async () => {
        balanceMap = new BalanceMapManager(
            {
              [wallet0.address]: 100,
              [wallet1.address]: 101,
              [wallet2.address]: 102
            });
        claims = balanceMap.merkleInfo.claims;
        const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
        distributor = await TEAMerkleDistributor.deploy(token.address, balanceMap.merkleInfo.merkleRoot);
        await distributor.deployed();

        await token.connect(owner).transfer(distributor.address, balanceMap.merkleInfo.tokenTotal);
      })

      describe('1) Succeeds when admin decrease claimable amount of an existing address by a quantity less than the claimable', () => {
        it('- Verify that the subtractable amount must be less than or equal to claimable amount', async () => {
          // Get wallet0`s claim data
          const claim0 = claims[wallet0.address];
          expect(await distributor.getClaimableAmt(claim0.index, wallet0.address, claim0.amount, claim0.proof)).to.be.eq(BigNumber.from(100));

          const oldTokenTotal = Number(balanceMap.merkleInfo.tokenTotal);

          balanceMap.updateNodes({[wallet2.address]: 50});
          await distributor.connect(owner).updateMerkleRoot(balanceMap.merkleInfo.merkleRoot);

          // withdraw the token amount of removed accounts
          expect(oldTokenTotal - Number(balanceMap.merkleInfo.tokenTotal)).to.be.eq(52);
          await distributor.connect(owner).withdrawToken(oldTokenTotal - Number(balanceMap.merkleInfo.tokenTotal));

          // Get new claims data
          const newClaims = balanceMap.merkleInfo.claims;

          // Verify that the subtractable amount must be less than or equal to claimable amount
          const claim2 = newClaims[wallet2.address];
          expect(await distributor.getClaimableAmt(claim2.index, wallet2.address, claim2.amount, claim2.proof)).to.be.eq(BigNumber.from(50));
          expect(await token.balanceOf(distributor.address)).to.lt(oldTokenTotal);
        });
      });

      it('2) Fails when non-admin decrease claimable amount of an existing address by a quantity less than the claimable', async () => {
        // Get wallet0`s claim data
        const claim0 = claims[wallet0.address];
        expect(await distributor.getClaimableAmt(claim0.index, wallet0.address, claim0.amount, claim0.proof)).to.be.eq(BigNumber.from(100));

        balanceMap.updateNodes({[wallet2.address]: 50});
        await expect(distributor.connect(wallets[9]).updateMerkleRoot(balanceMap.merkleInfo.merkleRoot)).to.revertedWith('Ownable: caller is not the owner');
      });

      it('3) Fails when admin decrease claimable amount by zero qty for an existing address', async () => {
        try {
          balanceMap.updateNodes({[wallet2.address]: 0})
        } catch (e) {
          return true;
        }
        throw('Not reverted');
      });

      it('4) Fails when admin decrease of a non-existing address', async () => {
        try {
          balanceMap.updateNodes({[wallets[9].address]: 50})
        } catch (e) {
          return true;
        }
        throw('Not reverted');
      })

      it('5) Fails when admin decrease of a zero address', async () => {
        try {
          balanceMap.updateNodes({[ZERO_ADDRESS]: 50})
        } catch (e) {
          return true;
        }
        throw('Not reverted');
      })
    })

    describe('4. Blacklist', () => {
      let distributor: Contract
      let balanceMap: BalanceMapManager
      let claims: {
        [account: string]: {
          index: number
          amount: string
          proof: string[]
        }
      }

      beforeEach('deploy', async () => {
        balanceMap = new BalanceMapManager(
            {
              [wallet0.address]: 100,
              [wallet1.address]: 101,
              [wallet2.address]: 102
            });
        claims = balanceMap.merkleInfo.claims;
        const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
        distributor = await TEAMerkleDistributor.deploy(token.address, balanceMap.merkleInfo.merkleRoot);
        await distributor.deployed();

        await token.connect(owner).transfer(distributor.address, balanceMap.merkleInfo.tokenTotal);
      })

      describe('1) Succeeds when admin decrease claimable amount of an existing address by a quantity less than the claimable', () => {
        it('- Verify that the root hash is not changed', async () => {
          expect(await distributor.checkAcct(wallet2.address)).to.be.eq(true);
          const oldMerkleRoot = balanceMap.merkleInfo.merkleRoot;

          await expect(distributor.connect(owner).blacklist(wallet2.address)).to.emit(distributor, 'Blacklisted').withArgs(wallet2.address);
          expect(await distributor.merkleRoot()).to.be.eq(oldMerkleRoot);
        });

        it('- Verify that the account is blacklisted', async () => {
          expect(await distributor.checkAcct(wallet2.address)).to.be.eq(true);

          await expect(distributor.connect(owner).blacklist(wallet2.address)).to.emit(distributor, 'Blacklisted').withArgs(wallet2.address);

          expect(await distributor.checkAcct(wallet2.address)).to.be.eq(false);
        });
      });

      it('2) Fails when non-admin blacklist an existing whitelisted address', async () => {
        expect(await distributor.checkAcct(wallet2.address)).to.be.eq(true);

        await expect(distributor.connect(wallet0).blacklist(wallet2.address)).to.revertedWith('Ownable: caller is not the owner');
      });

      it('3) Fails when admin blacklist an existing blacklisted address', async () => {
        await distributor.connect(owner).blacklist(wallet2.address);
        expect(await distributor.checkAcct(wallet2.address)).to.be.eq(false);

        await expect(distributor.connect(owner).blacklist(wallet2.address)).to.revertedWith('TEAMerkleDistributor: Already blocked');
      });

      it('4) Fails when admin blacklist a non-existing address', async () => {
        const claim9 = claims[wallets[9].address];
        if(claim9 !== undefined){
          throw ('Exist customer');
        }
        return true;
      });
    })

    describe('5. Whitelist', () => {
      let distributor: Contract
      let balanceMap: BalanceMapManager
      let claims: {
        [account: string]: {
          index: number
          amount: string
          proof: string[]
        }
      }

      beforeEach('deploy', async () => {
        balanceMap = new BalanceMapManager(
            {
              [wallet0.address]: 100,
              [wallet1.address]: 101,
              [wallet2.address]: 102
            });
        claims = balanceMap.merkleInfo.claims;
        const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
        distributor = await TEAMerkleDistributor.deploy(token.address, balanceMap.merkleInfo.merkleRoot);
        await distributor.deployed();

        await token.connect(owner).transfer(distributor.address, balanceMap.merkleInfo.tokenTotal);
        await distributor.connect(owner).blacklist(wallet2.address);
      })

      describe('1) Succeeds when admin decrease claimable amount of an existing address by a quantity less than the claimable', () => {
        it('- Verify that the root hash is not changed', async () => {
          expect(await distributor.checkAcct(wallet2.address)).to.be.eq(false);
          const oldMerkleRoot = balanceMap.merkleInfo.merkleRoot;

          await expect(distributor.connect(owner).whitelist(wallet2.address)).to.emit(distributor, 'Whitelisted').withArgs(wallet2.address);
          expect(await distributor.merkleRoot()).to.be.eq(oldMerkleRoot);
        });

        it('- Verify that the account is whitelisted', async () => {
          expect(await distributor.checkAcct(wallet2.address)).to.be.eq(false);

          await expect(distributor.connect(owner).whitelist(wallet2.address)).to.emit(distributor, 'Whitelisted').withArgs(wallet2.address);

          expect(await distributor.checkAcct(wallet2.address)).to.be.eq(true);
        });
      });

      it('2) Fails when non-admin whitelist an existing blacklisted address', async () => {
        expect(await distributor.checkAcct(wallet2.address)).to.be.eq(false);

        await expect(distributor.connect(wallet0).whitelist(wallet2.address)).to.revertedWith('Ownable: caller is not the owner');
      });

      it('3) Fails when admin whitelist an existing whitelisted address', async () => {
        expect(await distributor.checkAcct(wallet1.address)).to.be.eq(true);

        await expect(distributor.connect(owner).whitelist(wallet1.address)).to.revertedWith('TEAMerkleDistributor: Not blocked');
      });

      it('4) Fails when admin whitelist a non-existing address', async () => {
        const claim9 = claims[wallets[9].address];
        if(claim9 !== undefined){
          throw ('Exist customer');
        }
        return true;
      });
    })

    describe('6. Claim', () => {
      it('1) Fails for empty proof', async () => {
        const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
        const distributor = await TEAMerkleDistributor.deploy(token.address, ZERO_BYTES32);
        await distributor.deployed();
        await expect(distributor.connect(owner).claim(0, 10, 10, [])).to.be.revertedWith(
          'TEAMerkleDistributor: Invalid proof'
        )
      })

      it('2) Fails for invalid index', async () => {
        const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
        const distributor = await TEAMerkleDistributor.deploy(token.address, ZERO_BYTES32);
        await distributor.deployed();
        await expect(distributor.connect(owner).claim(0, 10, 10, [])).to.be.revertedWith(
          'TEAMerkleDistributor: Invalid proof'
        )
      })

      it('3) Must have enough to transfer', async () => {
        const tree = new BalanceTree([
          { account: wallet0.address, amount: BigNumber.from(100) },
          { account: wallet1.address, amount: BigNumber.from(101) },
        ])

        const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
        const distributor = await TEAMerkleDistributor.deploy(token.address, tree.getHexRoot());
        await distributor.deployed();

        await token.connect(owner).transfer(distributor.address, 99)

        const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
        await expect(distributor.connect(wallet0).claim(0, 100, 100, proof0)).to.be.revertedWith(
            'ERC20: transfer amount exceeds balance'
        )
      })

      describe('4) Two account tree', () => {
        let distributor: Contract
        let tree: BalanceTree
        beforeEach('deploy', async () => {
          tree = new BalanceTree([
            { account: wallet0.address, amount: BigNumber.from(100) },
            { account: wallet1.address, amount: BigNumber.from(101) },
          ])
          const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
          distributor = await TEAMerkleDistributor.deploy(token.address, tree.getHexRoot());
          await distributor.deployed();
          await token.connect(owner).transfer(distributor.address, 201);
        })

        it('- Succeeds when the claimer is whitelisted & requests less than or equal to claimable amount', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await expect(distributor.connect(wallet0).claim(0, 50, 100, proof0))
            .to.emit(distributor, 'Claimed')
            .withArgs(0, wallet0.address, 50)

          const proof1 = tree.getProof(1, wallet1.address, BigNumber.from(101))
          await expect(distributor.connect(wallet1).claim(1, 50, 101, proof1))
            .to.emit(distributor, 'Claimed')
            .withArgs(1, wallet1.address, 50)
        })

        it('- Transfers the token', async () => {
          const proof1 = tree.getProof(1, wallet1.address, BigNumber.from(101))
          expect(await token.balanceOf(wallet1.address)).to.eq(0)
          await distributor.connect(wallet1).claim(1, 50, 101, proof1)
          expect(await token.balanceOf(wallet1.address)).to.eq(50)
        })

        it('- Fails when the claimer is whitelisted & requests more than claimable amount', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await expect(distributor.connect(wallet0).claim(0, 200, 100, proof0)).to.be.revertedWith(
            'TEAMerkleDistributor: Invalid amount'
          )
        })

        it('- Fails when the claimer account is blacklisted', async () => {
          await distributor.connect(owner).blacklist(wallet0.address);
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await expect(distributor.connect(wallet0).claim(0, 50, 100, proof0)).to.be.revertedWith(
              'TEAMerkleDistributor: Blocked account'
          )
        })

        it('- Fails when claiming more amount', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await distributor.connect(wallet0).claim(0, 50, 100, proof0)
          await expect(distributor.connect(wallet0).claim(0, 80, 100, proof0)).to.be.revertedWith(
            'TEAMerkleDistributor: Invalid amount'
          )
        })

        it('- Fails when claiming for address other than proof', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await expect(distributor.connect(wallet1).claim(1, 101, 101, proof0)).to.be.revertedWith(
            'TEAMerkleDistributor: Invalid proof'
          )
        })

        it('- Fails when claiming for amount more than proof', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await expect(distributor.connect(wallet0).claim(0, 101, 101, proof0)).to.be.revertedWith(
            'TEAMerkleDistributor: Invalid proof'
          )
        })
      })

      describe('5) larger tree', () => {
        let distributor: Contract
        let tree: BalanceTree
        beforeEach('deploy', async () => {
          tree = new BalanceTree(
            wallets.map((wallet, ix) => {
              return { account: wallet.address, amount: BigNumber.from(ix + 1) }
            })
          )
          const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
          distributor = await TEAMerkleDistributor.deploy(token.address, tree.getHexRoot());
          await distributor.deployed();
          await token.connect(owner).transfer(distributor.address, 201);
        })

        it('- Claiming index 4', async () => {
          const proof = tree.getProof(4, wallets[4].address, BigNumber.from(5))
          await expect(distributor.connect(wallets[4]).claim(4, 5, 5, proof))
            .to.emit(distributor, 'Claimed')
            .withArgs(4, wallets[4].address, 5)
        })

        it('- Claiming index 9', async () => {
          const proof = tree.getProof(9, wallets[9].address, BigNumber.from(10))
          await expect(distributor.connect(wallets[9]).claim(9, 10, 10, proof))
            .to.emit(distributor, 'Claimed')
            .withArgs(9, wallets[9].address, 10)
        })
      })
  })

    describe('7. ClaimAll', () => {
      let distributor: Contract
      let tree: BalanceTree
      beforeEach('deploy', async () => {
        tree = new BalanceTree([
          { account: wallet0.address, amount: BigNumber.from(100) },
          { account: wallet1.address, amount: BigNumber.from(101) },
        ])
        const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
        distributor = await TEAMerkleDistributor.deploy(token.address, tree.getHexRoot());
        await distributor.deployed();
        await token.connect(owner).transfer(distributor.address, 201);
      })

      it('1) Succeeds when the claimer is whitelisted & requests less than or equal to claimable amount', async () => {
        const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
        await expect(distributor.connect(wallet0).claimAll(0, 100, proof0))
            .to.emit(distributor, 'ClaimedAll')
            .withArgs(0, wallet0.address, 100)

        const proof1 = tree.getProof(1, wallet1.address, BigNumber.from(101))
        await expect(distributor.connect(wallet1).claimAll(1, 101, proof1))
            .to.emit(distributor, 'ClaimedAll')
            .withArgs(1, wallet1.address, 101)
      });
      it('2) Fails when the claimer is whitelisted & requests more than claimable amount', async () => {
        const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
        await expect(distributor.connect(wallet0).claimAll(0, 200, proof0)).to.be.revertedWith(
            'TEAMerkleDistributor: Invalid proof'
        )
      });
      it('3) Fails when the claimer account is blacklisted', async () => {
        await distributor.connect(owner).blacklist(wallet0.address);
        const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
        await expect(distributor.connect(wallet0).claimAll(0, 100, proof0)).to.be.revertedWith(
            'TEAMerkleDistributor: Blocked account'
        )
      });
    })

    describe('8. Check Claimer', () => {
      let distributor: Contract
      let tree: BalanceTree
      beforeEach('deploy', async () => {
        tree = new BalanceTree([
          { account: wallet0.address, amount: BigNumber.from(100) },
          { account: wallet1.address, amount: BigNumber.from(101) },
        ])
        const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
        distributor = await TEAMerkleDistributor.deploy(token.address, tree.getHexRoot());
        await distributor.deployed();
        await token.connect(owner).transfer(distributor.address, 201);
      })

      it('1) Should return true/false when valid address is parsed', async () => {
        expect(await distributor.checkAcct(wallet0.address)).to.be.eq(true);
        expect(await distributor.checkAcct(wallet1.address)).to.be.eq(true);
      });

      it('2) Should revert when zero address is parsed', async () => {
        await expect(distributor.checkAcct(ZERO_ADDRESS)).to.revertedWith('TEAMerkleDistributor: Invalid address');
      });
    })

    describe('9. Get claimable amount', () => {
      let distributor: Contract
      let tree: BalanceTree
      beforeEach('deploy', async () => {
        tree = new BalanceTree([
          { account: wallet0.address, amount: BigNumber.from(100) },
          { account: wallet1.address, amount: BigNumber.from(101) },
        ])
        const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
        distributor = await TEAMerkleDistributor.deploy(token.address, tree.getHexRoot());
        await distributor.deployed();
        await token.connect(owner).transfer(distributor.address, 201);
      })

      it('1) Should return amount when an existing whitelisted address is parsed', async () => {
        const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100));
        expect(await distributor.getClaimableAmt(0, wallet0.address, 100, proof0)).to.be.eq(BigNumber.from(100));

        const proof1 = tree.getProof(1, wallet1.address, BigNumber.from(101));
        expect(await distributor.getClaimableAmt(1, wallet1.address, 101, proof1)).to.be.eq(BigNumber.from(101));

        await distributor.connect(wallet0).claim(0, 100, 100, proof0);

        expect(await distributor.getClaimableAmt(0, wallet0.address, 100, proof0)).to.be.eq(BigNumber.from(0));
        expect(await distributor.getClaimableAmt(1, wallet1.address, 101, proof1)).to.be.eq(BigNumber.from(101));
      });

      it('2) Should return zero when an existing blacklisted address is parsed', async () => {
        await distributor.connect(owner).blacklist(wallet0.address);
        const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100));
        expect(await distributor.getClaimableAmt(0, wallet0.address, 100, proof0)).to.be.eq(BigNumber.from(0));
      });

      it('3) Should revert when a non-existing address is parsed', async () => {
        const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100));
        await expect(distributor.getClaimableAmt(0, wallets[9].address, 100, proof0)).to.revertedWith('TEAMerkleDistributor: Invalid proof');
      });
    })

    describe('10. ParseBalanceMap', () => {
      let distributor: Contract
      let claims: {
        [account: string]: {
          index: number
          amount: string
          proof: string[]
        }
      }
      let balanceMapManager: BalanceMapManager;
      beforeEach('deploy', async () => {
        balanceMapManager = new BalanceMapManager({
          [wallet0.address]: 200,
          [wallet1.address]: 300,
          [wallet2.address]: 250,
        })
        const {claims: innerClaims, merkleRoot, tokenTotal} = balanceMapManager.merkleInfo;

        expect(tokenTotal).to.eq('0x02ee') // 750
        claims = innerClaims

        const TEAMerkleDistributor = await ethers.getContractFactory('TEAMerkleDistributor', owner);
        distributor = await TEAMerkleDistributor.deploy(token.address, merkleRoot);
        await distributor.deployed();

        await token.connect(owner).transfer(distributor.address, tokenTotal);
      })

      it('check the proofs is as expected', () => {
        expect(claims).to.deep.eq({
          [wallet0.address]: {
            index: 0,
            amount: '0xc8',
            proof: ['0xd7ef888d43be91d93e5cb3db848974c6f2a152e090924313de6a7c26373d6fa8'],
          },
          [wallet1.address]: {
            index: 1,
            amount: '0x012c',
            proof: [
              '0x3893b3d3281c5b7e95d8fc74d5538d8581e5cc71cb6eb3d16cac39f854354199',
              '0xd4bcae25f8c638720da1b8cd520bb3f840a4a753e4f01243c0d69414b4dc7247',
            ],
          },
          [wallet2.address]: {
            index: 2,
            amount: '0xfa',
            proof: [
              '0xb125790286c04a83af061f4100d3c689103538073ca9d8e6aa36656cc41b951d',
              '0xd4bcae25f8c638720da1b8cd520bb3f840a4a753e4f01243c0d69414b4dc7247',
            ],
          },
        })
      })

      it('all claims work exactly once', async () => {
        let index = 1;
        for (let account in claims) {
          const claim = claims[account]
          await expect(distributor.connect(wallets[index]).claimAll(claim.index, claim.amount, claim.proof))
              .to.emit(distributor, 'ClaimedAll')
              .withArgs(claim.index, account, claim.amount)
          await expect(distributor.connect(wallets[index]).claimAll(claim.index, claim.amount, claim.proof)).to.be.revertedWith(
              'TEAMerkleDistributor: Drop already claimed.'
          )
          index++;
        }
        expect(await token.balanceOf(distributor.address)).to.eq(0)
      })
    })
  })
}