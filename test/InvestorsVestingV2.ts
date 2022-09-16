import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { expect } from 'chai'

import { AlluoToken, AlluoToken__factory, InvestorsVesting, InvestorsVesting__factory, TeamVesting, TeamVestingV2 } from '../typechain'
import { parseUnits } from '@ethersproject/units'
import { BigNumber } from '@ethersproject/bignumber'


async function incrementNextBlockTimestamp(amount: number): Promise<void> {
    return ethers.provider.send("evm_increaseTime", [amount]);
}

async function setNextBlockTimestamp(amount: number): Promise<void> {
    return ethers.provider.send("evm_setNextBlockTimestamp", [amount]);
}

async function getLatestBlockTimestamp(): Promise<BigNumber> {
    let bl_num = await ethers.provider.send("eth_blockNumber", []);
    let cur_block = await ethers.provider.send("eth_getBlockByNumber", [bl_num, false]);
    return BigNumber.from(cur_block.timestamp);
}

async function mine() {
    await ethers.provider.send("evm_mine", []);
}

describe('Contract: InvestorsVestingV2', () => {
    let teamVesting: TeamVestingV2;
    let oldTeamVesting: TeamVesting;
    let signers: SignerWithAddress[];
    let alluo: AlluoToken;

    const cliffMonths = 6;
    const vestingMonthsCount = 24;
    const month = 2628000;

    before(async () => {
        signers = await ethers.getSigners();
    });

    beforeEach(async () => {
        const Alluo = await ethers.getContractFactory("AlluoToken");
        alluo = await Alluo.deploy(signers[0].address);

        const TeamVesting = await ethers.getContractFactory("TeamVesting");
        oldTeamVesting = await TeamVesting.deploy(alluo.address);

        const TeamVestingV2 = await ethers.getContractFactory("TeamVestingV2");
        teamVesting = await TeamVestingV2.deploy(alluo.address, signers[0].address);
    });

    it("Should import users with new timestamp and claim correct amount", async () => {
        const users = [signers[1], signers[2], signers[3]]
        const amounts = [20000000, 20000000, 100];
        const sum = amounts.reduce((partialSum, a) => partialSum + a, 0);

        await alluo.mint(oldTeamVesting.address, parseUnits(sum.toString(), await alluo.decimals()));
        await oldTeamVesting.addPrivateUser(
            users.map((x) => x.address),
            await Promise.all(
                amounts.map(async (x) => parseUnits(x.toString(), await alluo.decimals()))
            )
        )
        await oldTeamVesting.startCountdown(
            users.map((x) => x.address)
        );
        const timeStart = await getLatestBlockTimestamp();
        const timeEnd = timeStart.add(
            month * (cliffMonths + vestingMonthsCount)
        )

        await incrementNextBlockTimestamp(await oldTeamVesting.MONTH());

        await alluo.burn(oldTeamVesting.address, parseUnits(sum.toString(), await alluo.decimals()));
        await alluo.mint(teamVesting.address, parseUnits(sum.toString(), await alluo.decimals()));

        await setNextBlockTimestamp(
            timeStart.add(month * (cliffMonths)).toNumber()
        );

        await mine();
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const amount = parseUnits(amounts[i].toString(), await alluo.decimals())
            expect(await alluo.balanceOf(user.address)).to.be.equal(0);

            await teamVesting.importUser(user.address, oldTeamVesting.address);

            // check for updated timestamp
            expect((await teamVesting.getUserInfo(user.address)).vestingStartTime).to.be.equal(timeStart);

            // end time should not change
            expect((await teamVesting.getUserInfo(user.address)).vestingEndTime).to.be.equal(timeEnd);

            await teamVesting.connect(user).claimToken();
            let balanceAfter = await alluo.balanceOf(user.address);

            const blockTimestamp = await getLatestBlockTimestamp();
            const timeDiff = blockTimestamp.sub(timeStart);
            const timeEarning = amount.mul(timeDiff).div((vestingMonthsCount + cliffMonths) * month);

            expect(balanceAfter).to.be.equal(timeEarning);

            await incrementNextBlockTimestamp(month / 3);

            const balanceBefore = await alluo.balanceOf(user.address);
            await teamVesting.connect(user).claimToken();
            balanceAfter = await alluo.balanceOf(user.address);
            const income = balanceAfter.sub(balanceBefore);

            const blockTimestampNew = await getLatestBlockTimestamp();

            const timeDiffNew = blockTimestampNew.sub(blockTimestamp);
            const timeEarningNew = amount.mul(timeDiffNew).div((vestingMonthsCount + cliffMonths) * month);

            expect(timeEarningNew).to.be.equal(income);
        }

        await setNextBlockTimestamp(
            timeStart.add(month * (cliffMonths + vestingMonthsCount)).toNumber()
        );

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const amount = parseUnits(amounts[i].toString(), await alluo.decimals())

            await teamVesting.connect(user).claimToken();
            const balanceAfter = await alluo.balanceOf(user.address);

            expect(balanceAfter).to.be.equal(amount);
        }

        expect(await alluo.balanceOf(teamVesting.address)).to.be.equal(0);
    });
})