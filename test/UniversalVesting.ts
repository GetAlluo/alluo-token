import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { AlluoToken, UniversalVesting } from "../typechain";

describe("UniversalVesting", async () => {
    let signers: SignerWithAddress[];
    let vesting: UniversalVesting;
    let token: AlluoToken;

    const week = 604800;

    async function parseAlluo(amount: string): Promise<BigNumber> {
        return parseUnits(amount, await token.decimals());
    }

    async function incrementNextBlockTimestamp(amount: number): Promise<void> {
        return ethers.provider.send("evm_increaseTime", [amount]);
    }

    async function getLatestBlockTimestamp(): Promise<BigNumber> {
        let bl_num = await ethers.provider.send("eth_blockNumber", []);
        let cur_block = await ethers.provider.send("eth_getBlockByNumber", [bl_num, false]);
        return BigNumber.from(cur_block.timestamp);
    }

    async function mine() {
        await ethers.provider.send("evm_mine", []);
    }

    before(async () => {
        signers = await ethers.getSigners();
    })

    beforeEach(async () => {
        const Vesting = await ethers.getContractFactory("UniversalVesting");
        vesting = await Vesting.deploy(signers[0].address);

        const AlluoToken = await ethers.getContractFactory("AlluoToken");
        token = await AlluoToken.deploy(signers[0].address);

        await vesting.setTokenApproveStatus(token.address, true);
    });

    it("Should check initial values", async () => {
        expect(await vesting.nextId()).to.be.equal(0);

        // checking that EnumerableSet in mapping initialized properly
        expect(await vesting.getIdsForUser(signers[0].address)).to.be.empty;
    });

    it("Should add new recipient", async () => {
        const amount = await parseAlluo("100.0");
        const cliffPeriod = 3600;
        const vestingWeeks = 8;
        const recipient = signers[1];

        await token.mint(vesting.address, amount);

        expect(await vesting.debtByToken(token.address)).to.be.equal(0);

        await vesting.addRecipient(
            cliffPeriod,
            vestingWeeks,
            recipient.address,
            amount,
            token.address,
            false
        );
        const timestamp = await getLatestBlockTimestamp();
        const recipientSet = await vesting.getIdsForUser(recipient.address);
        const recipientData = await vesting.recipients(0);

        expect(await vesting.debtByToken(token.address)).to.be.equal(amount);
        expect(recipientSet.length).to.be.equal(1);
        expect(recipientSet[0]).to.be.equal(0);
        expect(await vesting.nextId()).to.be.equal(1);

        expect(recipientData.cliffPeriod).to.be.equal(cliffPeriod);
        expect(recipientData.vestingWeeks).to.be.equal(vestingWeeks);
        expect(recipientData.totalAllocation).to.be.equal(amount);
        expect(recipientData.paidOut).to.be.equal(0);
        expect(recipientData.admin).to.be.equal(signers[0].address);
        expect(recipientData.token).to.be.equal(token.address);
        expect(recipientData.recipient).to.be.equal(recipient.address);
        expect(recipientData.startTimestamp).to.be.equal(timestamp);
    });

    it("Should not add recipient (not enough tokens)", async () => {
        const amount = await parseAlluo("100.0");
        const cliffPeriod = 3600;
        const vestingWeeks = 8;
        const recipient = signers[1];

        const tx = vesting.addRecipient(
            cliffPeriod,
            vestingWeeks,
            recipient.address,
            amount,
            token.address,
            false
        );

        await expect(tx).to.be.revertedWith("UniversalVesting: low balance");
    })

    it("Should edit recipient data (changed recipient)", async () => {
        const amount = await parseAlluo("100.0");
        const cliffPeriod = 3600;
        const vestingWeeks = 8;
        const recipient = signers[1];

        await token.mint(vesting.address, amount);

        await vesting.addRecipient(
            cliffPeriod,
            vestingWeeks,
            recipient.address,
            amount,
            token.address,
            false
        );
        const timestamp = await getLatestBlockTimestamp();

        const newAmount = await parseAlluo("200.0");
        const newCliffPeriod = 7200;
        const newVestingWeeks = 16;
        const newRecipient = signers[2];

        await token.mint(vesting.address, newAmount.sub(amount));

        await vesting.editRecipient(
            0,
            newCliffPeriod,
            newVestingWeeks,
            newRecipient.address,
            newAmount,
            false
        )

        const oldRecipientSet = await vesting.getIdsForUser(recipient.address);
        const newRecipientSet = await vesting.getIdsForUser(newRecipient.address);
        const recipientData = await vesting.recipients(0);

        expect(await vesting.debtByToken(token.address)).to.be.equal(newAmount);
        expect(oldRecipientSet.length).to.be.equal(0);
        expect(newRecipientSet.length).to.be.equal(1);
        expect(newRecipientSet[0]).to.be.equal(0);
        expect(await vesting.nextId()).to.be.equal(1);

        expect(recipientData.cliffPeriod).to.be.equal(newCliffPeriod);
        expect(recipientData.vestingWeeks).to.be.equal(newVestingWeeks);
        expect(recipientData.totalAllocation).to.be.equal(newAmount);
        expect(recipientData.paidOut).to.be.equal(0);
        expect(recipientData.admin).to.be.equal(signers[0].address);
        expect(recipientData.token).to.be.equal(token.address);
        expect(recipientData.recipient).to.be.equal(newRecipient.address);
        expect(recipientData.startTimestamp).to.be.equal(timestamp);
    })

    it("Should edit recipient data (same recipient)", async () => {
        const amount = await parseAlluo("100.0");
        const cliffPeriod = 3600;
        const vestingWeeks = 8;
        const recipient = signers[1];

        await token.mint(vesting.address, amount);

        await vesting.addRecipient(
            cliffPeriod,
            vestingWeeks,
            recipient.address,
            amount,
            token.address,
            false
        );
        const timestamp = await getLatestBlockTimestamp();

        const newAmount = await parseAlluo("200.0");
        const newCliffPeriod = 7200;
        const newVestingWeeks = 16;

        await token.mint(vesting.address, newAmount.sub(amount));

        await vesting.editRecipient(
            0,
            newCliffPeriod,
            newVestingWeeks,
            recipient.address,
            newAmount,
            false
        )

        const recipientSet = await vesting.getIdsForUser(recipient.address);
        const recipientData = await vesting.recipients(0);

        expect(await vesting.debtByToken(token.address)).to.be.equal(newAmount);
        expect(recipientSet.length).to.be.equal(1);
        expect(recipientSet[0]).to.be.equal(0);
        expect(await vesting.nextId()).to.be.equal(1);

        expect(recipientData.cliffPeriod).to.be.equal(newCliffPeriod);
        expect(recipientData.vestingWeeks).to.be.equal(newVestingWeeks);
        expect(recipientData.totalAllocation).to.be.equal(newAmount);
        expect(recipientData.paidOut).to.be.equal(0);
        expect(recipientData.admin).to.be.equal(signers[0].address);
        expect(recipientData.token).to.be.equal(token.address);
        expect(recipientData.recipient).to.be.equal(recipient.address);
        expect(recipientData.startTimestamp).to.be.equal(timestamp);
    });

    it("Should not edit recipient data (not admin)", async () => {
        const amount = await parseAlluo("100.0");
        const cliffPeriod = 3600;
        const vestingWeeks = 8;
        const recipient = signers[1];

        await token.mint(vesting.address, amount);
        await vesting.setPublicStatus(true);

        await vesting.addRecipient(
            cliffPeriod,
            vestingWeeks,
            recipient.address,
            amount,
            token.address,
            false
        );

        const newAmount = await parseAlluo("200.0");
        const newCliffPeriod = 7200;
        const newVestingWeeks = 16;
        const notAdmin = signers[2]

        const tx = vesting.connect(notAdmin).editRecipient(
            0,
            newCliffPeriod,
            newVestingWeeks,
            recipient.address,
            newAmount,
            false
        )

        await expect(tx).to.be.revertedWith("UniversalVesting: not admin");
    })

    it("Should not edit recipient data (setting total allocation less than already paid out)", async () => {
        const amount = await parseAlluo("100.0");
        const cliffPeriod = 3600;
        const vestingWeeks = 8;
        const recipient = signers[1];

        await token.mint(vesting.address, amount);

        await vesting.addRecipient(
            cliffPeriod,
            vestingWeeks,
            recipient.address,
            amount,
            token.address,
            false
        );

        await incrementNextBlockTimestamp(cliffPeriod + 1);
        await vesting.connect(recipient).claimById(0);
        const newAmount = 0;

        const tx = vesting.editRecipient(
            0,
            cliffPeriod,
            vestingWeeks,
            recipient.address,
            newAmount,
            false
        );

        await expect(tx).to.be.revertedWith("UniversalVesting: low allocation");
    })

    it("Should not edit recipient data (contract balance too low for new allocation amount)", async () => {
        const amount = await parseAlluo("100.0");
        const cliffPeriod = 3600;
        const vestingWeeks = 8;
        const recipient = signers[1];

        await token.mint(vesting.address, amount);

        await vesting.addRecipient(
            cliffPeriod,
            vestingWeeks,
            recipient.address,
            amount,
            token.address,
            false
        );

        const newAmount = await parseAlluo("200.0");

        const tx = vesting.editRecipient(
            0,
            cliffPeriod,
            vestingWeeks,
            recipient.address,
            newAmount,
            false
        );

        await expect(tx).to.be.revertedWith("UniversalVesting: low balance");
    })

    it("Should change admin", async () => {
        const amount = await parseAlluo("100.0");
        const cliffPeriod = 3600;
        const vestingWeeks = 8;
        const recipient = signers[1];
        const newAdmin = signers[2];

        await token.mint(vesting.address, amount);

        await vesting.addRecipient(
            cliffPeriod,
            vestingWeeks,
            recipient.address,
            amount,
            token.address,
            false
        );
        const timestamp = await getLatestBlockTimestamp();

        await vesting.changeAdmin(0, newAdmin.address);
        const recipientData = await vesting.recipients(0);

        expect(recipientData.cliffPeriod).to.be.equal(cliffPeriod);
        expect(recipientData.vestingWeeks).to.be.equal(vestingWeeks);
        expect(recipientData.totalAllocation).to.be.equal(amount);
        expect(recipientData.paidOut).to.be.equal(0);
        expect(recipientData.admin).to.be.equal(newAdmin.address);
        expect(recipientData.token).to.be.equal(token.address);
        expect(recipientData.recipient).to.be.equal(recipient.address);
        expect(recipientData.startTimestamp).to.be.equal(timestamp);
    })

    it("Should not change admin (called by not current admin)", async () => {
        const amount = await parseAlluo("100.0");
        const cliffPeriod = 3600;
        const vestingWeeks = 8;
        const recipient = signers[1];
        const notAdmin = signers[2];

        await token.mint(vesting.address, amount);
        await vesting.setPublicStatus(true);

        await vesting.addRecipient(
            cliffPeriod,
            vestingWeeks,
            recipient.address,
            amount,
            token.address,
            false
        );

        const tx = vesting.connect(notAdmin).changeAdmin(0, notAdmin.address);
        await expect(tx).to.be.revertedWith("UniversalVesting: not admin");
    })

    it("Should claim no tokens for unkown user", async () => {
        const amount = await parseAlluo("100.0");
        const cliffPeriod = 3600;
        const vestingWeeks = 8;
        const recipient = signers[1];
        const unknownUser = signers[2];

        await token.mint(vesting.address, amount);

        await vesting.addRecipient(
            cliffPeriod,
            vestingWeeks,
            recipient.address,
            amount,
            token.address,
            false
        );

        await incrementNextBlockTimestamp(cliffPeriod + 1);
        await mine();

        const balanceBefore = await token.balanceOf(unknownUser.address);
        await vesting.connect(unknownUser).claimFromAll();
        const tx = vesting.connect(unknownUser).claimById(0);
        const balanceAfter = await token.balanceOf(unknownUser.address);
        expect(balanceBefore).to.be.equal(balanceAfter);

        expect(tx).to.be.revertedWith("UniversalVesting: not yours");
    })

    it("Should claim no tokens after vesting end", async () => {
        const amount = await parseAlluo("100.0");
        const cliffPeriod = 3600;
        const vestingWeeks = 8;
        const recipient = signers[1];

        expect(await token.balanceOf(recipient.address)).to.be.equal(0);

        await token.mint(vesting.address, amount.mul(2));
        await vesting.addRecipient(
            cliffPeriod,
            vestingWeeks,
            recipient.address,
            amount,
            token.address,
            false
        );

        await incrementNextBlockTimestamp((vestingWeeks * week) + 1);
        await mine();

        await vesting.connect(recipient).claimFromAll();
        expect(await token.balanceOf(recipient.address)).to.be.equal(amount);

        const recipientSet = await vesting.getIdsForUser(recipient.address);
        expect(recipientSet.length).to.be.equal(0);

        await vesting.connect(recipient).claimFromAll();
        await vesting.connect(recipient).claimById(0);
        expect(await token.balanceOf(recipient.address)).to.be.equal(amount);
        expect(await token.balanceOf(vesting.address)).to.be.equal(amount);
    });
})