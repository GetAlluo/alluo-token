import { ethers } from "hardhat";
import {AlluoToken__factory} from "../typechain"

const { exec } = require('child_process');
const hre = require("hardhat");

async function deploy() {

   // We get the contract to deploy
  const factory = await ethers.getContractFactory('AlluoToken') as AlluoToken__factory
  console.log("Deploying on live chain")
  const alluoToken = await factory.deploy("0xfb7A51c6f6A5116Ac748C1aDF4D4682c3D50889E");
  console.log("AlluoToken deploying to:", alluoToken.address);
  await alluoToken.deployed();
  console.log("! Deployed !");

  // For verification of the contract run: npx hardhat verify --network kovan --constructor-args contracts/arguments.js 0xb625dA6b38FD7c62747c777121140cA4b3D7fD05
  await hre.run("verify:verify", {
    address: alluoToken.address,
    constructorArguments: [
      process.env.NEW_ADMIN
    ],
  });
}

deploy()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });