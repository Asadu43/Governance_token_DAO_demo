import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, BigNumber, Signer } from "ethers";
import { parseEther } from "ethers/lib/utils";
import hre, { ethers, network } from "hardhat";

describe("Goverance Token", function () {
  let signers: Signer[];
  let owner: SignerWithAddress;
  let proposers: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;
  let voter4: SignerWithAddress;
  let voter5: SignerWithAddress;

  let token: Contract;
  let box: Contract;
  let timeLock: Contract;
  let governance: Contract;

  before(async () => {
    [owner, proposers, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("GovernanceToken");
    token = await Token.deploy();

    const Box = await ethers.getContractFactory("Box");
    box = await Box.deploy();

    const TimeLock = await ethers.getContractFactory("TimeLock");
    timeLock = await TimeLock.deploy(0, [proposers.address], [owner.address], owner.address);

    const Governance = await ethers.getContractFactory("GovernorContract");

    governance = await Governance.deploy(token.address, timeLock.address, 5, 5, 5);
  });

  it("Test Case", async function () {
    await box.transferOwnership(timeLock.address);
    const proposerRole = await timeLock.PROPOSER_ROLE();
    const executorRole = await timeLock.EXECUTOR_ROLE();

    await timeLock.connect(owner).grantRole(proposerRole, governance.address);
    await timeLock.connect(owner).grantRole(executorRole, governance.address);

    await token.delegate(voter1.address);
    await token.delegate(voter2.address);
    await token.delegate(voter3.address);
    await token.delegate(voter3.address);
    await token.delegate(voter4.address);

    const encodeData = box.interface.encodeFunctionData("store", [77]);

    const proposeTx = await governance.propose([box.address], [0], [encodeData], "Proposal #1 77 in the Box!");

    const data = await proposeTx.wait();

    const id = data.events[0].args.proposalId;

    console.log("ID", id);

    let proposalState = await governance.state(id);
    console.log(`Current Proposal State: ${proposalState}`);

    let blockNumber = await ethers.provider.getBlockNumber();

    console.log("Block Number", blockNumber);

    await moveBlocks(4 + 1);

    blockNumber = await ethers.provider.getBlockNumber();

    console.log("Block Number", blockNumber);

    proposalState = await governance.state(id);
    console.log(`Current Proposal State: ${proposalState}`);

    let quorum = await governance.quorum(blockNumber - 1);

    console.log(`Number of votes required to pass: ${quorum}\n`);

    await governance.connect(voter1).castVote(id, 1);
    await governance.connect(voter2).castVote(id, 1);
    await governance.connect(voter3).castVote(id, 1);
    await governance.connect(voter4).castVote(id, 1);
    await governance.connect(voter5).castVote(id, 0);

    blockNumber = await ethers.provider.getBlockNumber();

    console.log("Block Number", blockNumber);

    proposalState = await governance.state(id);
    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    console.log(`Current Proposal State: ${proposalState}`);
    await moveBlocks(1);

    quorum = await governance.quorum(blockNumber - 1);

    console.log(`Number of votes required to pass: ${(quorum.toString())}\n`);

    proposalState = await governance.state(id);
    console.log(`Current Proposal State: ${proposalState}`);

    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Proposal #1 77 in the Box!"));

    await governance.connect(owner).queue([box.address], [0], [encodeData], hash);

    await governance.connect(owner).execute([box.address], [0], [encodeData], hash);
  });
});

export async function moveBlocks(amount: number) {
  console.log("Moving blocks...");
  for (let index = 0; index < amount; index++) {
    await network.provider.request({
      method: "evm_mine",
      params: [],
    });
  }
  console.log(`Moved ${amount} blocks`);
}

export async function moveTime(amount: number) {
  console.log("Moving blocks...");
  await network.provider.send("evm_increaseTime", [amount]);

  console.log(`Moved forward in time ${amount} seconds`);
}
