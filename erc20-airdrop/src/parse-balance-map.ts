import { BigNumber, utils } from 'ethers'
import BalanceTree from './balance-tree'

const { isAddress, getAddress } = utils

// This is the blob that gets distributed and pinned to IPFS.
// It is completely sufficient for recreating the entire merkle tree.
// Anyone can verify that all air drops are included in the tree,
// and the tree has no additional distributions.
export interface MerkleDistributorInfo {
  merkleRoot: string
  tokenTotal: string
  claims: {
    [account: string]: {
      index: number
      amount: string
      proof: string[]
      flags?: {
        [flag: string]: boolean
      }
    }
  }
}

type OldFormat = { [account: string]: number }
type NewFormat = { address: string; earnings: string; reasons: string }

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export default class BalanceMapManager{
  private balances: OldFormat;
  public merkleInfo: MerkleDistributorInfo;

  constructor(_balances: OldFormat) {
    this.balances = _balances;
    this.merkleInfo = this.parseBalanceMap();
  }

  public addNodes(_nodes: OldFormat){
    Object.keys(_nodes).forEach(
        (account) => {
          if(_nodes[account] === 0 || account === ZERO_ADDRESS){
            throw ('Invalid node: ' + account);
          }
          if(this.balances[account] !== undefined){
            this.balances[account] = this.balances[account] + _nodes[account];
          } else {
            this.balances[account] = _nodes[account];
          }
        }
    )
    this.merkleInfo = this.parseBalanceMap();
  }

  public updateNodes(_nodes: OldFormat){
    Object.keys(_nodes).forEach(
        (account) => {
          if(_nodes[account] === 0 || account === ZERO_ADDRESS){
            throw ('Invalid node: ' + account);
          }
          if(this.balances[account] === undefined){
            throw ('No exist node: ' + account);
          }
          // TODO check claimable amount with updated amount
          // if(claimableAmts[account] < _nodes[account]){
          //   throw ('Invalid amount: ' + account);
          // }

          this.balances[account] = _nodes[account];
        }
    )
    this.merkleInfo = this.parseBalanceMap();
  }

  public removeNodes(_accounts: string[]){
    _accounts.forEach(account => {
      if(this.balances[account] !== undefined){
        delete this.balances[account];
      }
    })
    this.merkleInfo = this.parseBalanceMap();
  }

  public parseBalanceMap(): MerkleDistributorInfo {
    // if balances are in an old format, process them
    const balancesInNewFormat: NewFormat[] = Object.keys(this.balances).map(
          (account): NewFormat => ({
            address: account,
            earnings: `0x${this.balances[account].toString(16)}`,
            reasons: '',
          })
        )

    const dataByAddress = balancesInNewFormat.reduce<{
      [address: string]: { amount: BigNumber; flags?: { [flag: string]: boolean } }
    }>((memo, { address: account, earnings, reasons }) => {
      if (!isAddress(account)) {
        throw new Error(`Found invalid address: ${account}`)
      }
      const parsed = getAddress(account)
      if (memo[parsed]) throw new Error(`Duplicate address: ${parsed}`)
      const parsedNum = BigNumber.from(earnings)
      if (parsedNum.lte(0)) throw new Error(`Invalid amount for account: ${account}`)

      const flags = {
        isSOCKS: reasons.includes('socks'),
        isLP: reasons.includes('lp'),
        isUser: reasons.includes('user'),
      }

      memo[parsed] = { amount: parsedNum, ...(reasons === '' ? {} : { flags }) }
      return memo
    }, {})

    const sortedAddresses = Object.keys(dataByAddress).sort()

    // construct a tree
    const tree = new BalanceTree(
      sortedAddresses.map((address) => ({ account: address, amount: dataByAddress[address].amount }))
    )

    // generate claims
    const claims = sortedAddresses.reduce<{
      [address: string]: { amount: string; index: number; proof: string[]; flags?: { [flag: string]: boolean } }
    }>((memo, address, index) => {
      const { amount, flags } = dataByAddress[address]
      memo[address] = {
        index,
        amount: amount.toHexString(),
        proof: tree.getProof(index, address, amount),
        ...(flags ? { flags } : {}),
      }
      return memo
    }, {})

    const tokenTotal: BigNumber = sortedAddresses.reduce<BigNumber>(
      (memo, key) => memo.add(dataByAddress[key].amount),
      BigNumber.from(0)
    )

    return {
      merkleRoot: tree.getHexRoot(),
      tokenTotal: tokenTotal.toHexString(),
      claims,
    }
  }
}
