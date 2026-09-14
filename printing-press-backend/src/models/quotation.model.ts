// models/quotation.model.ts

export type QuotationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED';

// Matches `quotation` table exactly
export interface Quotation {
  id?: number;
  quotation_number?: string | null;
  customer_id?: number;
  customer_name?: string;       // joined from customer table
  base_cost?: number;
  extra_charges?: number;
  profit_margin?: number;
  total_cost?: number;
  status?: QuotationStatus;
  dateCreated?: Date | string;
  job_name: string;
  job_type: 'leaflet' | 'book';

  associated_job_id?: number | null;
}

// Matches `quotation_item` table exactly
export interface QuotationItem {
  item_id?: number;
  quotation_id?: number;
  description?: string;
  quantity?: number;
  width?: number;
  height?: number;
  pages?: number;
  front_color_pages?: number| null;
  back_color_pages?: number| null;
  cover_front_color_pages?: number| null;
  cover_back_color_pages?: number| null;
  material_id?: number| null;
  binding_id?: number| null;
  lamination_id?: number| null;
  unit_cost?: number;
  total_cost?: number;
}

// What Step 1 frontend sends
export interface CreateQuotationRequest {
  customer_name: string;
  email: string;
  phone: string; 
  address: string;      
  job_name: string;
  job_type: string; // 'leaflet' | 'book'
  status: 'DRAFT';
  associated_job_id?: number | null;
}

// What Step 2 frontend sends — both tables in one request
export interface QuotationPayload {
  quotation: Quotation;
  item: QuotationItem;
}
