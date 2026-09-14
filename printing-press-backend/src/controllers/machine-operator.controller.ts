import { Request, Response } from 'express';
import { setDailyAssignment, getDailyAssignments, getMachineStatusBoard, updateMachineStatus } from '../services/operator-assignment.service';

const todayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMachineOperators = async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || todayDate();
    res.json(await getDailyAssignments(date));
  } catch (err) {
    console.error('getMachineOperators error:', err);
    res.status(500).json({ message: 'Failed to fetch daily assignments' });
  }
};

export const setMachineOperatorHandler = async (req: Request, res: Response) => {
  try {
    const machineId = Number(req.params.id);
    const { user_id, date } = req.body;
    const assignDate = date || todayDate();
    if (!user_id) { res.status(400).json({ message: 'user_id is required' }); return; }
    await setDailyAssignment(machineId, user_id, assignDate);
    res.json({ message: `Operator assigned for ${assignDate}` });
  } catch (err: any) {
    console.error('setMachineOperatorHandler error:', err);
    res.status(400).json({ message: err.message || 'Failed to assign operator' });
  }
};

export const getMachineStatuses = async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || todayDate();
    res.json(await getMachineStatusBoard(date));
  } catch (err) {
    console.error('getMachineStatuses error:', err);
    res.status(500).json({ message: 'Failed to fetch machine statuses' });
  }
};

export const setMachineStatusHandler = async (req: Request, res: Response) => {
  try {
    const machineId = Number(req.params.id);
    if (!Number.isInteger(machineId) || machineId <= 0) {
      res.status(400).json({ message: 'Invalid machine id' });
      return;
    }

    if (typeof req.body.is_active !== 'boolean') {
      res.status(400).json({ message: 'is_active boolean is required' });
      return;
    }

    res.json(await updateMachineStatus(machineId, req.body.is_active));
  } catch (err: any) {
    console.error('setMachineStatusHandler error:', err);
    res.status(400).json({ message: err.message || 'Failed to update machine status' });
  }
};
