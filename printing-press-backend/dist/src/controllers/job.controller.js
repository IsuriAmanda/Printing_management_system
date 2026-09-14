"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyDashboard = exports.getOtherStageJobs = exports.startJobHandler = exports.getMachines = exports.setMachine = exports.editJobPreStart = exports.changeJobStatus = exports.convertJob = exports.getJobLogs = exports.getJobById = exports.getAllJobs = void 0;
const job_service_1 = require("../services/job.service");
const job_service_2 = require("../services/job.service");
const parseJobId = (id) => {
    if (Array.isArray(id) || id === undefined || id === null)
        return null;
    const jobId = Number(id);
    return Number.isInteger(jobId) && jobId > 0 ? jobId : null;
};
// GET /api/jobs
const getAllJobs = async (req, res) => {
    try {
        const data = await (0, job_service_1.fetchAllJobs)();
        res.json(data);
    }
    catch (err) {
        console.error('getAllJobs error:', err);
        res.status(500).json({ message: 'Failed to fetch jobs' });
    }
};
exports.getAllJobs = getAllJobs;
// GET /api/jobs/:id
const getJobById = async (req, res) => {
    try {
        const jobId = parseJobId(req.params.id);
        if (!jobId) {
            res.status(400).json({ message: 'Invalid job id' });
            return;
        }
        const data = await (0, job_service_1.fetchJobById)(jobId);
        if (!data) {
            res.status(404).json({ message: 'Job not found' });
            return;
        }
        res.json(data);
    }
    catch (err) {
        console.error('getJobById error:', err);
        res.status(500).json({ message: 'Failed to fetch job' });
    }
};
exports.getJobById = getJobById;
// GET /api/jobs/:id/logs
const getJobLogs = async (req, res) => {
    try {
        const jobId = parseJobId(req.params.id);
        if (!jobId) {
            res.status(400).json({ message: 'Invalid job id' });
            return;
        }
        const data = await (0, job_service_1.fetchJobStageLogs)(jobId);
        res.json(data);
    }
    catch (err) {
        console.error('getJobLogs error:', err);
        res.status(500).json({ message: 'Failed to fetch logs' });
    }
};
exports.getJobLogs = getJobLogs;
// POST /api/jobs/convert
// Converts confirmed quotation to job ticket
const convertJob = async (req, res) => {
    try {
        const result = await (0, job_service_1.convertQuotationToJob)(req.body);
        res.status(201).json(result);
    }
    catch (err) {
        console.error('convertJob error:', err);
        if (err.message === 'PAST_DUE_DATE') {
            res.status(400).json({ message: 'Due date cannot be earlier than today' });
            return;
        }
        res.status(500).json({ message: err.message || 'Failed to convert quotation' });
    }
};
exports.convertJob = convertJob;
// PATCH /api/jobs/:id/status
const changeJobStatus = async (req, res) => {
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
        const result = await (0, job_service_1.updateJobStatus)(jobId, status, remarks, req.user);
        res.json(result);
    }
    catch (err) {
        console.error('changeJobStatus error:', err);
        res.status(409).json({ message: err.message || 'Failed to update status' });
    }
};
exports.changeJobStatus = changeJobStatus;
const editJobPreStart = async (req, res) => {
    try {
        const jobId = parseJobId(req.params.id);
        if (!jobId) {
            res.status(400).json({ message: 'Invalid job id' });
            return;
        }
        const result = await (0, job_service_1.updateJobPreStartDetails)(jobId, req.body);
        res.json(result);
    }
    catch (err) {
        console.error('editJobPreStart error:', err);
        res.status(409).json({ message: err.message || 'Failed to update job details' });
    }
};
exports.editJobPreStart = editJobPreStart;
// PATCH /api/jobs/:id/machine
const setMachine = async (req, res) => {
    try {
        const jobId = parseJobId(req.params.id);
        if (!jobId) {
            res.status(400).json({ message: 'Invalid job id' });
            return;
        }
        const { machine_id } = req.body;
        const result = await (0, job_service_1.assignMachine)(jobId, machine_id);
        res.json(result);
    }
    catch (err) {
        console.error('setMachine error:', err);
        res.status(409).json({ message: err.message || 'Failed to assign machine' });
    }
};
exports.setMachine = setMachine;
// GET /api/jobs/machines
const getMachines = async (req, res) => {
    try {
        const data = await (0, job_service_1.fetchAllMachines)();
        res.json(data);
    }
    catch (err) {
        console.error('getMachines error:', err);
        res.status(500).json({ message: 'Failed to fetch machines' });
    }
};
exports.getMachines = getMachines;
const startJobHandler = async (req, res) => {
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
        const result = await (0, job_service_1.startJob)(jobId, req.user.id);
        if (!result.success) {
            res.status(409).json({ message: result.message });
            return;
        }
        res.json(result);
    }
    catch (err) {
        console.error('startJob error:', err);
        res.status(500).json({ message: err.message || 'Failed to start job' });
    }
};
exports.startJobHandler = startJobHandler;
const getOtherStageJobs = async (req, res) => {
    try {
        res.json(await (0, job_service_2.fetchOtherStageJobsForUser)(req.user));
    }
    catch (err) {
        console.error('getOtherStageJobs error:', err);
        res.status(500).json({ message: 'Failed to fetch jobs' });
    }
};
exports.getOtherStageJobs = getOtherStageJobs;
const getMyDashboard = async (req, res) => {
    try {
        if (!req.user?.id) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const data = await (0, job_service_2.fetchOperatorDashboard)(req.user.id);
        res.json(data);
    }
    catch (err) {
        console.error('getMyDashboard error:', err);
        res.status(500).json({ message: 'Failed to load dashboard' });
    }
};
exports.getMyDashboard = getMyDashboard;
