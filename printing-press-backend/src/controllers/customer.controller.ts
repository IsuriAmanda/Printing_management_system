import { Request, Response } from 'express';
import {
  fetchAllCustomers,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '../services/customer.service';

// GET /api/customers
export const getAllCustomers = async (req: Request, res: Response) => {
  try {
    const data = await fetchAllCustomers();
    res.json(data);
  } catch (err) {
    console.error('getAllCustomers error:', err);
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
};

// GET /api/customers/:id
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const data = await fetchCustomerById(Number(req.params.id));
    if (!data) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }
    res.json(data);
  } catch (err) {
    console.error('getCustomerById error:', err);
    res.status(500).json({ message: 'Failed to fetch customer' });
  }
};

// POST /api/customers
export const addCustomer = async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ message: 'Customer name is required' });
    return;
  }

  try {
    const result = await createCustomer(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    console.error('addCustomer error:', err);
    if (err.message === 'INVALID_EMAIL') {
      res.status(400).json({ message: 'Enter a valid email address' });
      return;
    }
    if (err.message === 'DUPLICATE_EMAIL_AND_PHONE') {
      res.status(409).json({ message: 'Both email address and phone number already belong to existing customers' });
      return;
    }
    if (err.message === 'DUPLICATE_EMAIL') {
      res.status(409).json({ message: 'Customer with this email address already exists' });
      return;
    }
    if (err.message === 'DUPLICATE_PHONE') {
      res.status(409).json({ message: 'Customer with this phone number already exists' });
      return;
    }
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: 'Customer with this email already exists' });
      return;
    }
    res.status(500).json({ message: 'Failed to create customer' });
  }
};

// PUT /api/customers/:id
export const editCustomer = async (req: Request, res: Response) => {
  const id  = Number(req.params.id);
  const { name } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ message: 'Customer name is required' });
    return;
  }

  try {
    const result = await updateCustomer(id, req.body);
    if (!result) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }
    res.json(result);
  } catch (err: any) {
    console.error('editCustomer error:', err);
    if (err.message === 'INVALID_EMAIL') {
      res.status(400).json({ message: 'Enter a valid email address' });
      return;
    }
    if (err.message === 'DUPLICATE_EMAIL_AND_PHONE') {
      res.status(409).json({ message: 'Both email address and phone number already belong to existing customers' });
      return;
    }
    if (err.message === 'DUPLICATE_EMAIL') {
      res.status(409).json({ message: 'Customer with this email address already exists' });
      return;
    }
    if (err.message === 'DUPLICATE_PHONE') {
      res.status(409).json({ message: 'Customer with this phone number already exists' });
      return;
    }
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: 'Customer with this email already exists' });
      return;
    }
    res.status(500).json({ message: 'Failed to update customer' });
  }
};

// DELETE /api/customers/:id
/*export const removeCustomer = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const deleted = await deleteCustomer(id);
    if (!deleted) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (err: any) {
    console.error('removeCustomer error:', err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(409).json({
        message: 'Cannot delete — customer has existing quotations'
      });
      return;
    }
    res.status(500).json({ message: 'Failed to delete customer' });
  }
};*/















