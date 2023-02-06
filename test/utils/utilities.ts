import hre from "hardhat";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Signer, Contract } from "ethers";



export const getTime = async (): Promise<number> => {
    return (await hre.ethers.provider.getBlock("latest")).timestamp
}

export async function increaseTime(duration: number): Promise<void> {
    ethers.provider.send("evm_increaseTime", [duration]);
    ethers.provider.send("evm_mine", []);
}
