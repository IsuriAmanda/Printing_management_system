export type QuotationStatus = 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type SizeUnit = 'in' | 'cm' | 'mm';

export interface Quotation {
  id?:                number;
  quotation_number?:  string | null;
  customer_id?:       number;
  base_cost?:         number;
  extra_charges?:     number;
  profit_margin?:     number;
  total_cost?:        number;
  status?:            QuotationStatus;
  job_name:           string;
  dateCreated?:       Date | string;
  customer_name?:     string;
  job_type:           string;
  associated_job_id?: number | null;

  // ── From quotation_item JOIN (populated by getById) ──
  item_id?:                  number | null;
  quantity?:                 number | null;
  width?:                    number | null;
  height?:                   number | null;
  pages?:                    number | null;
  front_color_pages?:        number | null;
  back_color_pages?:         number | null;
  cover_front_color_pages?:  number | null;
  cover_back_color_pages?:   number | null;
  material_id?:              number | null;
  binding_id?:               number | null;
  lamination_id?:            number | null;
}

export interface QuotationItem {
  item_id?:                  number;
  quotation_id?:             number;
  description?:              string;
  quantity?:                 number;
  width?:                    number;
  height?:                   number;
  pages?:                    number;
  front_color_pages?:        number;
  back_color_pages?:         number;
  cover_front_color_pages?:  number;
  cover_back_color_pages?:   number;
  material_id?:              number | null;
  binding_id?:               number | null;
  lamination_id?:            number | null;
  unit_cost?:                number;
  total_cost?:               number;
  // Added fields for cutting calculation tracking
  pieces_per_sheet?:         number;
  sheets_needed?:            number;
}

export interface QuotationPayload {
  quotation: Quotation;
  item:      QuotationItem;
}

export interface CreateQuotationRequest {
  customer_name: string;
  email:         string;
  phone:         string;
  address:       string;
  job_name:      string;
  job_type:      string;
  status:        QuotationStatus; // Updated to accept all status types
}
