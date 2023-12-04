import { ethers } from "ethers";
import ABI from "./ABI.json";
// import { doApiLogin } from "./ApiService";

const ADAPTER_ADDRESS = `${process.env.REACT_APP_ADAPTER_ADDRESS}`;

export enum Profile {
  RESIDENT = 0,
  COUNSELOR = 1,
  MANAGER = 2,
}

function getProfile(): Profile {
  const profile = localStorage.getItem("profile") || "0";
  return parseInt(profile);
}

function getProvider(): ethers.BrowserProvider {
  if (!window.ethereum) throw new Error("No MetaMask found");
  return new ethers.BrowserProvider(window.ethereum);
}

function getContract(provider?: ethers.BrowserProvider): ethers.Contract {
  if (!provider) provider = getProvider();
  return new ethers.Contract(
    ADAPTER_ADDRESS,
    ABI as ethers.InterfaceAbi,
    provider
  );
}

async function getContractSigner(
  provider?: ethers.BrowserProvider
): Promise<ethers.Contract> {
  if (!provider) provider = getProvider();
  const signer = await provider.getSigner(
    localStorage.getItem("account") || undefined
  );
  const contract = new ethers.Contract(
    ADAPTER_ADDRESS,
    ABI as ethers.InterfaceAbi,
    provider
  );
  return contract.connect(signer) as ethers.Contract;
}

export type LoginResult = {
  account: string;
  profile: Profile;
  token: string;
};

export type Resident = {
  wallet: string;
  isCounselor: boolean;
  isManager: boolean;
  residence: number;
  nextPayment: ethers.BigNumberish;
};

export function hasManagerPermissions(): boolean {
  return parseInt(localStorage.getItem("profile") || "0") === Profile.MANAGER;
}

export function hasCounselorPermissions(): boolean {
  return parseInt(localStorage.getItem("profile") || "0") !== Profile.RESIDENT;
}

export function hasResidentPermissions(): boolean {
  return parseInt(localStorage.getItem("profile") || "0") === Profile.RESIDENT;
}

export async function doLogin(): Promise<LoginResult> {
  const provider = getProvider();

  const accounts = await provider.send("eth_requestAccounts", []);

  if (!accounts || !accounts.length)
    throw new Error("Wallet not found/allowed.");

  const contract = getContract(provider);

  const resident = (await contract.getResident(accounts[0])) as Resident;
  let isManager = resident.isManager;

  if (!isManager && resident.residence > 0) {
    if (resident.isCounselor)
      localStorage.setItem("profile", `${Profile.COUNSELOR}`);
    else localStorage.setItem("profile", `${Profile.RESIDENT}`);
  } else if (!isManager && !resident.residence) {
    const manager = (await contract.getManager()) as string;
    isManager = accounts[0].toUpperCase() === manager.toUpperCase();
  }

  if (isManager) localStorage.setItem("profile", `${Profile.MANAGER}`);
  else if (localStorage.getItem("profile") === null)
    throw new Error("Unauthorized");

  localStorage.setItem("account", accounts[0]);

  // const signer = await provider.getSigner();
  // const timestamp = Date.now();
  // const message = `Authenticating to Condominium. Timestamp: ${timestamp}`;
  // const secret = await signer.signMessage(message);

  // const token = await doApiLogin(accounts[0], secret, timestamp);
  // localStorage.setItem("token", token);

  return {
    // token,
    account: accounts[0],
    profile: parseInt(localStorage.getItem("profile") || "0"),
  } as LoginResult;
}

export function doLogout() {
  localStorage.removeItem("account");
  localStorage.removeItem("profile");
  localStorage.removeItem("token");
}

export async function getAddress(): Promise<string> {
  const contract = getContract();
  return contract.getImplAddress();
}

export type ResidentPage = {
  residents: Resident[];
  total: ethers.BigNumberish;
};

export async function getResident(wallet: string): Promise<Resident> {
  const contract = getContract();
  return contract.getResident(wallet) as Promise<Resident>;
}

export async function getResidents(
  page: number = 1,
  pageSize: number = 10
): Promise<ResidentPage> {
  const contract = getContract();
  const result = (await contract.getResidents(page, pageSize)) as ResidentPage;
  const residents = [...result.residents.filter((r) => r.residence)].sort(
    (a, b) => ethers.toNumber(a.residence - b.residence)
  );

  return {
    residents,
    total: result.total,
  } as ResidentPage;
}

export async function upgrade(address: string): Promise<ethers.Transaction> {
  if (getProfile() !== Profile.MANAGER)
    throw new Error(`You do not have permission.`);
  const contract = await getContractSigner();
  return contract.upgrade(address) as Promise<ethers.Transaction>;
}

export async function addResident(
  wallet: string,
  residenceId: number
): Promise<ethers.Transaction> {
  if (getProfile() === Profile.RESIDENT)
    throw new Error(`You do not have permission.`);
  const contract = await getContractSigner();
  return contract.addResident(
    wallet,
    residenceId
  ) as Promise<ethers.Transaction>;
}

export async function removeResident(
  wallet: string
): Promise<ethers.Transaction> {
  if (getProfile() !== Profile.MANAGER)
    throw new Error(`You do not have permission.`);
  const contract = await getContractSigner();
  return contract.removeResident(wallet) as Promise<ethers.Transaction>;
}

export async function setCounselor(
  wallet: string,
  isEntering: boolean
): Promise<ethers.Transaction> {
  if (getProfile() !== Profile.MANAGER)
    throw new Error(`You do not have permission.`);
  const contract = await getContractSigner();
  return contract.setCounselor(
    wallet,
    isEntering
  ) as Promise<ethers.Transaction>;
}

export enum Category {
  DECISION = 0,
  SPENT = 1,
  CHANGE_QUOTA = 2,
  CHANGE_MANAGER = 3,
}

export enum Status {
  IDLE = 0,
  VOTING = 1,
  APPROVED = 2,
  DENIED = 3,
  DELETED = 4,
  SPENT = 5,
}

export type Topic = {
  title: string;
  description: string;
  category: Category;
  amount: ethers.BigNumberish;
  responsible: string;
  status?: Status;
  createdDate?: ethers.BigNumberish;
  startDate?: ethers.BigNumberish;
  endDate?: ethers.BigNumberish;
};

export type TopicPage = {
  topics: Topic[];
  total: ethers.BigNumberish;
};

export async function getTopic(title: string): Promise<Topic> {
  const contract = getContract();
  return contract.getTopic(title) as Promise<Topic>;
}

export async function getTopics(
  page: number = 1,
  pageSize: number = 10
): Promise<TopicPage> {
  const contract = getContract();
  const result = (await contract.getTopics(page, pageSize)) as TopicPage;
  const topics = result.topics.filter((t) => t.title);

  return {
    topics,
    total: result.total,
  } as TopicPage;
}

export async function removeTopic(title: string): Promise<ethers.Transaction> {
  if (getProfile() !== Profile.MANAGER)
    throw new Error(`You do not have permission.`);
  const contract = await getContractSigner();
  return contract.removeTopic(title) as Promise<ethers.Transaction>;
}

export async function addTopic(topic: Topic): Promise<ethers.Transaction> {
  const contract = await getContractSigner();
  topic.amount = ethers.toBigInt(topic.amount || 0);
  return contract.addTopic(
    topic.title,
    topic.description,
    topic.category,
    topic.amount,
    topic.responsible
  ) as Promise<ethers.Transaction>;
}

export async function editTopic(
  topicToEdit: string,
  description: string,
  amount: ethers.BigNumberish,
  responsible: string
): Promise<ethers.Transaction> {
  if (getProfile() !== Profile.MANAGER)
    throw new Error(`You do not have permission.`);
  const contract = await getContractSigner();
  amount = ethers.toBigInt(amount || 0);
  return contract.editTopic(
    topicToEdit,
    description,
    amount,
    responsible
  ) as Promise<ethers.Transaction>;
}

export async function openVoting(topic: string): Promise<ethers.Transaction> {
  if (getProfile() !== Profile.MANAGER)
    throw new Error(`You do not have permission.`);
  const contract = await getContractSigner();
  return contract.openVoting(topic) as Promise<ethers.Transaction>;
}

export async function closeVoting(topic: string): Promise<ethers.Transaction> {
  if (getProfile() !== Profile.MANAGER)
    throw new Error(`You do not have permission.`);
  const contract = await getContractSigner();
  return contract.closeVoting(topic) as Promise<ethers.Transaction>;
}

export async function payQuota(
  residenceId: number,
  value: ethers.BigNumberish
): Promise<ethers.Transaction> {
  if (getProfile() !== Profile.RESIDENT)
    throw new Error(`You do not have permission.`);
  const contract = await getContractSigner();
  return contract.payQuota(residenceId, {
    value,
  }) as Promise<ethers.Transaction>;
}

export async function getQuota(): Promise<ethers.BigNumberish> {
  const contract = getContract();
  const quota = await contract.getQuota();
  return ethers.toBigInt(quota);
}

export enum Options {
  EMPTY = 0,
  YES = 1,
  NO = 2,
  ABSTENTION = 3,
}

export type Vote = {
  resident: string;
  residence: number;
  timestamp: number;
  option: Options;
};

export async function getVotes(topic: string): Promise<Vote[]> {
  const contract = getContract();
  return contract.getVotes(topic) as Promise<Vote[]>;
}

export async function getBalance(address?: string): Promise<string> {
  if (!address) address = await getAddress();
  const provider = getProvider();
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

export async function vote(
  topic: string,
  option: Options
): Promise<ethers.Transaction> {
  const contract = await getContractSigner();
  return contract.vote(topic, option) as Promise<ethers.Transaction>;
}

export async function transfer(
  topic: string,
  amount: ethers.BigNumberish
): Promise<ethers.Transaction> {
  if (getProfile() !== Profile.MANAGER)
    throw new Error(`You do not have permission.`);
  const contract = await getContractSigner();
  return contract.transfer(topic, amount) as Promise<ethers.Transaction>;
}
