import { Request, Response } from 'express';
import {
  fetchAllJobs,
  fetchJobById,
  fetchJobStageLogs,
  convertQuotationToJob,
  updateJobStatus,
  assignMachine,
  fetchAllMachines,
  startJob,fetchOtherStageJobs,
  updateJobPreStartDetails
} from '../services/job.service';
import { fetchOperatorDashboard, fetchOtherStageJobsForUser } from '../services/job.service';
import { AuthRequest } from '../middleware/auth.middleware';

const parseJobId = (id: unknown): number | null => {
  if (Array.isArray(id) || id === undefined || id === null) return null;

  const jobId = Number(id);
  return Number.isInteger(jobId) && jobId > 0 ? jobId : null;
};

// GET /api/jobs
export const getAllJobs = async (req: Request, res: Response) => {
  try {
    const data = await fetchAllJobs();
    res.json(data);
  } catch (err) {
    console.error('getAllJobs error:', err);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
};

// GET /api/jobs/:id
export const getJobById = async (req: Request, res: Response) => {
  try {
    const jobId = parseJobId(req.params.id);
    if (!jobId) {
      res.status(400).json({ message: 'Invalid job id' });
      return;
    }

    const data = await fetchJobById(jobId);
    if (!data) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }
    res.json(data);
  } catch (err) {
    console.error('getJobById error:', err);
    res.status(500).json({ message: 'Failed to fetch job' });
  }
};

// GET /api/jobs/:id/logs
export const getJobLogs = async (req: Request, res: Response) => {
  try {
    const jobId = parseJobId(req.params.id);
    if (!jobId) {
      res.status(400).json({ message: 'Invalid job id' });
      return;
    }

    const data = await fetchJobStageLogs(jobId);
    res.json(data);
  } catch (err) {
    console.error('getJobLogs error:', err);
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
};

// POST /api/jobs/convert
// Converts confirmed quotation to job ticket
export const convertJob = async (req: Request, res: Response) => {
  try {
    const result = await convertQuotationToJob(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    console.error('convertJob error:', err);
    if (err.message === 'PAST_DUE_DATE') {
      res.status(400).json({ message: 'Due date cannot be earlier than today' });
      return;
    }
    res.status(500).json({ message: err.message || 'Failed to convert quotation' });
  }
};

// PATCH /api/jobs/:id/status
export const changeJobStatus = async (req: AuthRequest, res: Response) => {
  try {
    const jobId = parseJobId(req.params.id);
    if (!jobId) {
      res.status(400).json({ message: 'Invalid job id' });
      return;
    }

    const { status, remarks } = req.body;
    if (!status) {
      res.status(400).json({ message: 'Status is required' });
      return;
    }
    const result = await updateJobStatus(
      jobId, status, remarks, req.user
    );
    res.json(result);
  } catch (err: any) {
    console.error('changeJobStatus error:', err);
    res.status(409).json({ message: err.message || 'Failed to update status' });
  }
};

export const editJobPreStart = async (req: Request, res: Response) => {
  try {
    const jobId = parseJobId(req.params.id);
    if (!jobId) {
      res.status(400).json({ message: 'Invalid job id' });
      return;
    }

    const result = await updateJobPreStartDetails(jobId, req.body);
    res.json(result);
  } catch (err: any) {
    console.error('editJobPreStart error:', err);
    res.status(409).json({ message: err.message || 'Failed to update job details' });
  }
};

// PATCH /api/jobs/:id/machine
export const setMachine = async (req: Request, res: Response) => {
  try {
    const jobId = parseJobId(req.params.id);
    if (!jobId) {
      res.status(400).json({ message: 'Invalid job id' });
      return;
    }

    const { machine_id } = req.body;
    const result = await assignMachine(jobId, machine_id);
    res.json(result);
  } catch (err: any) {
    console.error('setMachine error:', err);
    res.status(409).json({ message: err.message || 'Failed to assign machine' });
  }
};

// GET /api/jobs/machines
export const getMachines = async (req: Request, res: Response) => {
  try {
    const data = await fetchAllMachines();
    res.json(data);
  } catch (err) {
    console.error('getMachines error:', err);
    res.status(500).json({ message: 'Failed to fetch machines' });
  }
};

export const startJobHandler = async (req: AuthRequest, res: Response) => {
  try {
    const jobId = parseJobId(req.params.id);
    if (!jobId) {
      res.status(400).json({ message: 'Invalid job id' });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const result = await startJob(jobId, req.user.id);
    if (!result.success) { res.status(409).json({ message: result.message }); return; }
    res.json(result);
  } catch (err: any) {
    console.error('startJob error:', err);
    res.status(500).json({ message: err.message || 'Failed to start job' });
  }
};

export const getOtherStageJobs = async (req: Request, res: Response) => {
  try {
    res.json(await fetchOtherStageJobsForUser((req as AuthRequest).user));
  } catch (err) {
    console.error('getOtherStageJobs error:', err);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
};
export const getMyDashboard = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const data = await fetchOperatorDashboard(req.user.id);
    res.json(data);
  } catch (err) {
    console.error('getMyDashboard error:', err);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
};

