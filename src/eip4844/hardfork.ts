import type { HardforkConfig } from "./types.js";

enum Status {
  Draft = "draft",
  Review = "review",
  Final = "final",
}

export const hardforks: HardforkConfig = {
  name: "cancun",
  comment:
    "Next feature hardfork after shanghai, includes proto-danksharding EIP 4844 blobs (still WIP hence not for production use), transient storage opcodes, parent beacon block root availability in EVM, selfdestruct only in same transaction, and blob base fee opcode",
  url: "https://github.com/ethereum/execution-specs/blob/master/network-upgrades/mainnet-upgrades/cancun.md",
  status: Status.Final,
  eips: [1153, 4844, 4788, 5656, 6780, 7516],
};
export enum Hardfork {
  Chainstart = "chainstart",
  Homestead = "homestead",
  Dao = "dao",
  TangerineWhistle = "tangerineWhistle",
  SpuriousDragon = "spuriousDragon",
  Byzantium = "byzantium",
  Constantinople = "constantinople",
  Petersburg = "petersburg",
  Istanbul = "istanbul",
  MuirGlacier = "muirGlacier",
  Berlin = "berlin",
  London = "london",
  ArrowGlacier = "arrowGlacier",
  GrayGlacier = "grayGlacier",
  MergeForkIdTransition = "mergeForkIdTransition",
  Paris = "paris",
  Shanghai = "shanghai",
  Cancun = "cancun",
}
