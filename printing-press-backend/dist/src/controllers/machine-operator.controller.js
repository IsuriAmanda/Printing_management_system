"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMachineStatusHandler = exports.getMachineStatuses = exports.setMachineOperatorHandler = exports.getMachineOperators = void 0;
const operator_assignment_service_1 = require("../services/operator-assignment.service");
const todayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const getMachineOperators = async (req, res) => {
    try {
        const date = req.query.date || todayDate();
        res.json(await (0, operator_assignment_service_1.getDailyAssignments)(date));
    }
    catch (err) {
        console.error('getMachineOperators error:', err);
        res.status(500).json({ message: 'Failed to fetch daily assignments' });
    }
};
exports.getMachineOperators = getMachineOperators;
const setMachineOperatorHandler = async (req, res) => {
    try {
        const machineId = Number(req.params.id);
        const { user_id, date } = req.body;
        const assignDate = date || todayDate();
        if (!user_id) {
            res.status(400).json({ message: 'user_id is required' });
            return;
        }
        await (0, operator_assignment_service_1.setDailyAssignment)(machineId, user_id, assignDate);
        res.json({ message: `Operator assigned for ${assignDate}` });
    }
    catch (err) {
        console.error('setMachineOperatorHandler error:', err);
        res.status(400).json({ message: err.message || 'Failed to assign operator' });
    }
};
exports.setMachineOperatorHandler = setMachineOperatorHandler;
const getMachineStatuses = async (req, res) => {
    try {
        const date = req.query.date || todayDate();
        res.json(await (0, operator_assignment_service_1.getMachineStatusBoard)(date));
    }
    catch (err) {
        console.error('getMachineStatuses error:', err);
        res.status(500).json({ message: 'Failed to fetch machine statuses' });
    }
};
exports.getMachineStatuses = getMachineStatuses;
const setMachineStatusHandler = async (req, res) => {
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
        res.json(await (0, operator_assignment_service_1.updateMachineStatus)(machineId, req.body.is_active));
    }
    catch (err) {
        console.error('setMachineStatusHandler error:', err);
        res.status(400).json({ message: err.message || 'Failed to update machine status' });
    }
};
exports.setMachineStatusHandler = setMachineStatusHandler;
