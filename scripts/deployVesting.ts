import { ethers } from "hardhat";
import {InvestorsVesting__factory} from "../typechain"

async function deploy() {

   // We get the contract to deploy
  const factory = await ethers.getContractFactory('InvestorsVesting') as InvestorsVesting__factory
  
  const investorsVesting = await factory.deploy("token");
  console.log("Vesting deploying to:", investorsVesting.address);
  await investorsVesting.deployed();
  console.log("! deployed !");
}

deploy()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
