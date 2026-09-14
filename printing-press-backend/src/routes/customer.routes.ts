import { Router } from 'express';
import {
  getAllCustomers,
  getCustomerById,
  editCustomer,
  addCustomer,

} from '../controllers/customer.controller';
import { verifyToken, allowRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyToken, allowRoles('Admin', 'Manager'));

router.get('/',    getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/',    addCustomer);
router.put('/:id',  editCustomer);


export default router;
