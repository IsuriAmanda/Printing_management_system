import { Router } from 'express';
import {
  getAllJobs,
  getJobById,
  getJobLogs,
  convertJob,
  changeJobStatus,
  setMachine,
  getMachines,
  startJobHandler,
  getMyDashboard,
  getOtherStageJobs,
  editJobPreStart
} from '../controllers/job.controller';
import {
  getMachineOperators,
  getMachineStatuses,
  setMachineOperatorHandler,
  setMachineStatusHandler
} from '../controllers/machine-operator.controller';
import { verifyToken, allowRoles } from '../middleware/auth.middleware';
import { isManagerOrAdmin } from '../middleware/role.middleware';

const router = Router();

router.use(verifyToken);

// Specific routes must stay before parameterized routes.
router.get('/machines', allowRoles('Admin', 'Manager'), getMachines);
router.get('/machines/operators', allowRoles('Admin', 'Manager'), getMachineOperators);
router.get('/machines/statuses', allowRoles('Admin', 'Manager'), getMachineStatuses);
router.get('/my/dashboard', allowRoles('Operator', 'Admin', 'Manager'), getMyDashboard);
router.get('/other-stages', allowRoles('Operator', 'Admin', 'Manager'), getOtherStageJobs);
router.get('/', allowRoles('Admin', 'Manager'), getAllJobs);
router.get('/:id/logs', allowRoles('Admin', 'Manager'), getJobLogs);
router.get('/:id', allowRoles('Admin', 'Manager'), getJobById);

router.post('/convert', allowRoles('Admin', 'Manager'), convertJob);

router.patch('/machines/:id/status', isManagerOrAdmin, setMachineStatusHandler);
router.patch('/machines/:id/operator', isManagerOrAdmin, setMachineOperatorHandler);
router.patch('/:id/pre-start-details', allowRoles('Admin', 'Manager'), editJobPreStart);
router.patch('/:id/status', allowRoles('Operator'), changeJobStatus);
router.patch('/:id/machine', allowRoles('Admin', 'Manager'), setMachine);
router.patch('/:id/start', allowRoles('Operator'), startJobHandler);

export default router;
