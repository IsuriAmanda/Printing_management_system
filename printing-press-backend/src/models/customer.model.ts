export type CustomerStatus = 'Active' | 'Inactive' | 'Lead';

export interface Customer {
  customer_id?: number;
  name:         string;
  phone?:       string | null;
  email?:       string | null;
  address?:     string | null;
  status?:      CustomerStatus;
}

export interface CreateCustomerRequest {
  name:      string;
  phone?:    string;
  email?:    string;
  address?:  string;
  status?:   CustomerStatus;
}

export interface UpdateCustomerRequest {
  name?:     string;
  phone?:    string;
  email?:    string;
  address?:  string;
  status?:   CustomerStatus;
}
