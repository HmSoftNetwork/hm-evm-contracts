import { program } from 'commander'
import fs from 'fs'
import BalanceMapManager from '../src/parse-balance-map'

program
  .version('0.0.0')
  .requiredOption(
    '-i, --input <path>',
    'input JSON file location containing a map of account addresses to string balances'
  )
  .requiredOption(
      '-o, --output <path>',
      'output JSON file location containing the merkle tree data'
  )

program.parse(process.argv)

const options = program.opts();
const json = JSON.parse(fs.readFileSync(options.input, { encoding: 'utf8' }))

if (typeof json !== 'object') throw new Error('Invalid JSON')

const balanceMapManager = new BalanceMapManager(json);
const merkleInfo = balanceMapManager.merkleInfo;

console.log('MerkleRoot: ', merkleInfo.merkleRoot);
console.log(`TokenTotal: ${merkleInfo.tokenTotal} (${Number(merkleInfo.tokenTotal)})`);
console.log('Claims: ', JSON.stringify(merkleInfo.claims));

fs.writeFileSync(options.output, JSON.stringify(merkleInfo), { encoding: 'utf8' })