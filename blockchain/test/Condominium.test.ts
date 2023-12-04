import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Condominium", function () {
  enum Options {
    EMPTY = 0,
    YES = 1,
    NO = 2,
    ABSTENTION = 3,
  }

  enum Status {
    IDLE = 0,
    VOTING = 1,
    APPROVED = 2,
    DENIED = 3,
  }

  async function deployFixture() {
    const [manager, resident] = await ethers.getSigners();

    const Condominium = await ethers.getContractFactory("Condominium");
    const contract = await Condominium.deploy();

    return { contract, manager, resident };
  }

  it("Should be residence", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);
    expect(await contract.residenceExists(2102)).to.equal(true);
  });

  it("Should add resident", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);

    expect(await contract.isResident(resident.address)).to.equal(true);
  });

  it("Should NOT add resident (permission)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    const instance = contract.connect(resident);
    await expect(
      instance.addResident(resident.address, 2102)
    ).to.be.revertedWith("Only the manager or the council can do this");
  });

  it("Should NOT add resident (residence)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await expect(
      contract.addResident(resident.address, 21020)
    ).to.be.revertedWith("This residence does not exists");
  });

  it("Should remove resident", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);
    await contract.removeResident(resident.address);

    expect(await contract.isResident(resident.address)).to.equal(false);
  });

  it("Should NOT remove resident (permission)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);

    const instance = contract.connect(resident);
    await expect(instance.removeResident(resident.address)).to.be.revertedWith(
      "Only the manager can do this"
    );
  });

  it("Should NOT remove resident (counselor)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);

    await contract.setCounselor(resident.address, true);

    await expect(contract.removeResident(resident.address)).to.be.revertedWith(
      "A counselor cannot be removed"
    );
  });

  it("Should set counselor", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);

    await contract.setCounselor(resident.address, true);

    expect(await contract.counselors(resident.address)).to.equal(true);
  });

  it("Should NOT set counselor (permission)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);

    const instance = contract.connect(resident);
    await expect(
      instance.setCounselor(resident.address, true)
    ).to.be.revertedWith("Only the manager can do this");
  });

  it("Should NOT set counselor (resident)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await expect(
      contract.setCounselor(resident.address, true)
    ).to.be.revertedWith("The counselor must be a resident");
  });

  it("Should set manager", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.setManager(resident.address);

    expect(await contract.manager()).to.equal(resident.address);
  });

  it("Should NOT set manager (permission)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    const instance = contract.connect(resident);
    await expect(instance.setManager(resident.address)).to.be.revertedWith(
      "Only the manager can do this"
    );
  });

  it("Should NOT set manager (address)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await expect(
      contract.setManager("0x0000000000000000000000000000000000000000")
    ).to.be.revertedWith("The address must be valid");
  });

  it("Should add topic (manager)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addTopic("topic 1", "description 1");

    expect(await contract.topicExists("topic 1")).to.equal(true);
  });

  it("Should add topic (resident)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);

    const instance = contract.connect(resident);
    await instance.addTopic("topic 1", "description 1");

    expect(await contract.topicExists("topic 1")).to.equal(true);
  });

  it("Should NOT add topic (permission)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    const instance = contract.connect(resident);
    await expect(
      instance.addTopic("topic 1", "description 1")
    ).to.be.revertedWith("Only the manager or the residents can do this");
  });

  it("Should NOT add topic (permission)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);
    await contract.addTopic("topic 1", "description 1");
    await expect(
      contract.addTopic("topic 1", "description 1")
    ).to.be.revertedWith("This topic already exists");
  });

  it("Should remove topic", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addTopic("topic 1", "description 1");
    await contract.removeTopic("topic 1");

    expect(await contract.topicExists("topic 1")).to.equal(false);
  });

  it("Should NOT remove topic (permission)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addTopic("topic 1", "description 1");

    const intance = contract.connect(resident);

    await expect(intance.removeTopic("topic 1")).to.be.revertedWith(
      "Only the manager can do this"
    );
  });

  it("Should NOT remove topic (exists)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await expect(contract.removeTopic("topic 1")).to.be.revertedWith(
      "The topic does not exists"
    );
  });

  it("Should NOT remove topic (status)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addTopic("topic 1", "description 1");

    await contract.openVoting("topic 1");

    await expect(contract.removeTopic("topic 1")).to.be.revertedWith(
      "Only IDLE topics can be removed"
    );
  });

  it("Should vote", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);
    await contract.addTopic("topic 1", "description 1");
    await contract.openVoting("topic 1");

    const instance = contract.connect(resident);
    await instance.vote("topic 1", Options.YES);

    expect(await instance.numberOfVotes("topic 1")).to.equal(1);
  });

  it("Should NOT vote (duplicated)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);
    await contract.addTopic("topic 1", "description 1");
    await contract.openVoting("topic 1");

    const instance = contract.connect(resident);
    await instance.vote("topic 1", Options.YES);

    await expect(instance.vote("topic 1", Options.YES)).to.be.revertedWith(
      "A residence should vote only once"
    );
  });

  it("Should NOT vote (status)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);
    await contract.addTopic("topic 1", "description 1");

    const instance = contract.connect(resident);

    await expect(instance.vote("topic 1", Options.YES)).to.be.revertedWith(
      "Only VOTING topics can be voted"
    );
  });

  it("Should NOT vote (exists)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);
    const instance = contract.connect(resident);

    await expect(instance.vote("topic 1", Options.YES)).to.be.revertedWith(
      "The topic does not exists"
    );
  });

  it("Should NOT vote (permission)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addTopic("topic 1", "description 1");
    await contract.openVoting("topic 1");

    const instance = contract.connect(resident);

    await expect(instance.vote("topic 1", Options.YES)).to.be.revertedWith(
      "Only the manager or the residents can do this"
    );
  });

  it("Should NOT vote (empty)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);
    await contract.addTopic("topic 1", "description 1");
    await contract.openVoting("topic 1");

    const instance = contract.connect(resident);

    await expect(instance.vote("topic 1", Options.EMPTY)).to.be.revertedWith(
      "The option cannot be EMPTY"
    );
  });

  it("Should close voting", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);
    await contract.addTopic("topic 1", "description 1");
    await contract.openVoting("topic 1");

    await contract.vote("topic 1", Options.YES);

    const instance = contract.connect(resident);
    await instance.vote("topic 1", Options.YES);

    await contract.closeVoting("topic 1");
    const topic = await contract.getTopic("topic 1");

    expect(topic.status).to.equal(Status.APPROVED);
  });

  it("Should NOT close voting (permission)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);
    await contract.addTopic("topic 1", "description 1");
    await contract.openVoting("topic 1");

    const instance = contract.connect(resident);
    await expect(instance.closeVoting("topic 1")).to.be.revertedWith(
      "Only the manager can do this"
    );
  });

  it("Should NOT close voting (exists)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);
    await expect(contract.closeVoting("topic 1")).to.be.revertedWith(
      "The topic does not exists"
    );
  });

  it("Should NOT close voting (status)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addTopic("topic 1", "description 1");
    await expect(contract.closeVoting("topic 1")).to.be.revertedWith(
      "Only VOTING topics can be closed"
    );
  });

  it("Should NOT open voting (permission)", async function () {
    const { contract, manager, resident } = await loadFixture(deployFixture);

    await contract.addResident(resident.address, 2102);
    await contract.addTopic("topic 1", "description 1");

    const instance = contract.connect(resident);
    await expect(instance.openVoting("topic 1")).to.be.revertedWith(
      "Only the manager can do this"
    );
  });
});
