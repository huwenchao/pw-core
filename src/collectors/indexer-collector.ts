import { CollectorOptions } from './collector';
import { SUDTCollector } from './sudt-collector';
import { Cell, Address, Amount, AmountUnit, SUDT } from '..';
import {
  CkbIndexer,
  HexString,
  IndexerCellToCell,
  Script,
  ScriptType,
  Terminator,
} from '../helpers/ckb-indexer';

export class IndexerCollector extends SUDTCollector {
  private indexer: CkbIndexer;
  constructor(public apiBase: string) {
    super();
    this.indexer = new CkbIndexer(apiBase);
  }

  async getBalance(address: Address): Promise<Amount> {
    const lock = address.toLockScript();
    const searchKey = {
      script: {
        code_hash: lock.codeHash,
        args: lock.args,
        hash_type: lock.hashType,
      },
      script_type: ScriptType.lock,
      filter: {
        output_data_len_range: ['0x0', '0x1'] as [HexString, HexString],
      },
    };
    // console.log({searchKey});
    const cells = (await this.indexer.getCells(searchKey)).filter(
      (cell) => cell.output.type === null
    );
    // console.dir(cells, {depth: null});
    let balance = Amount.ZERO;
    cells.forEach((cell) => {
      const amount = new Amount(cell.output.capacity, AmountUnit.shannon);
      balance = balance.add(amount);
    });
    return balance;
  }

  async collect(address: Address, options: CollectorOptions): Promise<Cell[]> {
    if (!options || !options.neededAmount) {
      throw new Error("'neededAmount' in options must be provided");
    }
    let accCapacity = Amount.ZERO;
    const terminator: Terminator = (_index, cell) => {
      if (accCapacity.gte(options.neededAmount)) {
        return { stop: true, push: false };
      }
      if (cell.output_data.length / 2 - 1 > 0 || cell.output.type !== null) {
        return { stop: false, push: false };
      } else {
        accCapacity = accCapacity.add(
          new Amount(cell.output.capacity, AmountUnit.shannon)
        );
        return { stop: false, push: true };
      }
    };
    const lock = address.toLockScript();
    const searchKey = {
      script: {
        code_hash: lock.codeHash,
        args: lock.args,
        hash_type: lock.hashType,
      },
      script_type: ScriptType.lock,
      filter: {
        output_data_len_range: ['0x0', '0x1'] as [HexString, HexString],
      },
    };
    const cells = await this.indexer.getCells(searchKey, terminator);
    // console.dir(cells, {depth: null});
    return cells.map((cell) => IndexerCellToCell(cell));
  }

  async getSUDTBalance(sudt: SUDT, address: Address): Promise<Amount> {
    const lock = address.toLockScript();
    const searchKey = {
      script: {
        code_hash: lock.codeHash,
        args: lock.args,
        hash_type: lock.hashType,
      },
      script_type: ScriptType.lock,
      filter: {
        script: sudt.toTypeScript().serializeJson() as Script,
      },
    };
    // console.log({searchKey});
    const cells = await this.indexer.getCells(searchKey);
    // console.dir(cells, {depth: null});
    let balance = Amount.ZERO;
    cells.forEach((cell) => {
      const amount = Amount.fromUInt128LE(cell.output_data);
      balance = balance.add(amount);
    });
    return balance;
  }

  async collectSUDT(
    sudt: SUDT,
    address: Address,
    options: CollectorOptions
  ): Promise<Cell[]> {
    if (!options || !options.neededAmount) {
      throw new Error("'neededAmount' in options must be provided");
    }
    const lock = address.toLockScript();
    const searchKey = {
      script: {
        code_hash: lock.codeHash,
        args: lock.args,
        hash_type: lock.hashType,
      },
      script_type: ScriptType.lock,
      filter: {
        script: sudt.toTypeScript().serializeJson() as Script,
      },
    };
    let accCapacity = Amount.ZERO;
    const terminator: Terminator = (_index, cell) => {
      if (accCapacity.gte(options.neededAmount)) {
        return { stop: true, push: false };
      }
      accCapacity = accCapacity.add(Amount.fromUInt128LE(cell.output_data));
      return { stop: false, push: true };
    };
    const cells = await this.indexer.getCells(searchKey, terminator);
    // console.dir(cells, {depth: null});
    return cells.map((cell) => IndexerCellToCell(cell));
  }
}