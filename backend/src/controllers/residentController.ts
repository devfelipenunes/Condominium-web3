import { Request, Response, NextFunction } from "express";
import residentRepository from "../repositories/residentRepository";
import Resident from "src/models/resident";
import { keccak256 } from "ethers";

export async function getResident(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const wallet = req.params.wallet;
  const resident = await residentRepository.getResident(wallet);
  if (!resident) return res.sendStatus(404);

  return res.status(200).json(resident);
}

export async function postResident(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const resident = req.body as Resident;
  const result = await residentRepository.addResident(resident);
  return res.status(201).json(result);
}

export async function patchResident(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const wallet = req.params.wallet;
  const resident = req.body as Resident;
  const result = await residentRepository.updateResident(wallet, resident);

  return res.json(result);
}

export async function deleteResident(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const wallet = req.params.wallet;
  const sucess = await residentRepository.deleteResident(wallet);

  if (sucess) return res.sendStatus(204);
  else return res.sendStatus(404);
}

export default {
  getResident,
  postResident,
  patchResident,
  deleteResident,
};
