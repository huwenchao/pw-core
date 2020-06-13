import test from 'ava';
import PWCore, { ChainID, Address, AddressType } from '..';
import { RawTransaction, Cell, OutPoint, CellDep } from '.';
import { DummyCollector } from '../collectors';
import { DepType } from '../interfaces';

const address = new Address(
  'ckt1qyqxpayn272n8km2k08hzldynj992egs0waqnr8zjs',
  AddressType.ckb
);

let pw: PWCore;

test.before(async () => {
  pw = new PWCore('https://aggron.ckb.dev');
  await pw.init(new DummyCollector(address), ChainID.ckb_testnet);
});

const outPoint1 = new OutPoint(
  '0x85f2eb3737f79af418361e6c6c03a5d9f0060b085a888c0c70d762842af1b6c1',
  '0x1'
);
const outPoint2 = new OutPoint(
  '0x79221866125b9aff33c4303a6c35bde25d235e7e10025a86ca2a5d6ad657f51f',
  '0x0'
);
const outPoint3 = new OutPoint(
  '0x79221866125b9aff33c4303a6c35bde25d235e7e10025a86ca2a5d6ad657f51f',
  '0x1'
);
const outPoint4 = new OutPoint(
  '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37',
  '0x0'
);

let rawTx = null;

test.before(async () => {
  const cells = await Promise.all([
    Cell.loadFromBlockchain(pw.rpc, outPoint1),
    Cell.loadFromBlockchain(pw.rpc, outPoint2),
    Cell.loadFromBlockchain(pw.rpc, outPoint3),
  ]);

  const inputs = [cells[0]];
  const outputs = cells.slice(1);
  const cellDeps = [new CellDep(DepType.depGroup, outPoint4)];

  rawTx = new RawTransaction(inputs, outputs, cellDeps);
});

test('validate', (t) => {
  t.notThrows(() => rawTx.validate());
});

test('toHash', (t) => {
  t.is(
    rawTx.toHash(),
    '0x79221866125b9aff33c4303a6c35bde25d235e7e10025a86ca2a5d6ad657f51f'
  );
});