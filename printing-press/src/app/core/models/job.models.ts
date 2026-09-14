export type JobStatus =
  | 'PRINTING'
  | 'CUTTING'
  | 'FOLDING'
  | 'BINDING'
  | 'PACKING'
  | 'COMPLETED';

export type JobPriority = 'LOW' | 'MEDIUM' | 'URGENT';

// Matches job_ticket table exactly
export interface JobTicket {
  job_id?:          number;
  job_number?:      string;
  job_name:         string;
  job_type?:        string;
  customer_id?:     number;
  customer_name?:   string;
  quantity?:        number;
  width?:           number;
  height?:          number;
  pages?:           number;
  material?:        string;
  material_id?:     number | null;
  material_name?:   string | null;
  material_unit_price?: number | null;
  material_width?:  number | null;
  material_height?: number | null;
  binding_id?:      number | null;
  binding_name?:    string | null;
  binding_min_pages?: number | null;
  binding_max_pages?: number | null;
  binding_price?:   number | null;
  lamination_id?:   number | null;
  lamination_name?: string | null;
  lamination_price?: number | null;
  lamination_size_name?: string | null;
  lamination_width?: number | null;
  lamination_height?: number | null;
  machine_id?:      number | null;
  machine_name?:    string;
  remarks?:         string;
  priority?:        JobPriority;
  quotation_id?:    number | null;
  status?:          JobStatus;
  due_date?:        string;
  scheduled_date?:  string | null;
  created_at?:      string;
  completed_at?:    string | null;
  department?:      string | null;
  source?:          string | null;
  front_color_pages?: number | null;
  back_color_pages?: number | null;
  cover_front_color_pages?: number | null;
  cover_back_color_pages?: number | null;
  is_printing_started?: boolean | number;
  can_edit_pre_start?: boolean | number;
  quotation_number?: string | null;
  quotation_status?: string | null;
  quotation_date_created?: string | null;
  quotation_job_name?: string | null;
  quotation_job_type?: string | null;
  item_id?: number | null;
  item_description?: string | null;
  item_quantity?: number | null;
  item_width?: number | null;
  item_height?: number | null;
  item_pages?: number | null;
  item_binding_id?: number | null;
  item_lamination_id?: number | null;
  item_total_cost?: number | null;
  base_cost?: number | null;
  extra_charges?: number | null;
  profit_margin?: number | null;
  quotation_total_cost?: number | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  artwork?: Array<{
    artwork_id: number;
    quotation_id: number;
    file_name: string;
    file_path: string;
    uploaded_at: string;
  }>;
  cutting?: {
    piecesPerSheet: number;
    rows: number;
    cols: number;
    rotated: boolean;
    sheetsNeeded: number;
    mainPieces: number;
    extraPieces: number;
    extraCols: number;
    extraRows: number;
    extraIsRight: boolean;
  } | null;
}

// Matches job_stage_log table
export interface JobStageLog {
  log_id?:    number;
  job_id:     number;
  stage:      string;
  status:     string;
  remarks?:   string;
  timestamp?: string;
}

// Machine lookup
export interface Machine {
  machine_id: number;
  name:       string;
  width?:     number;
  height?:    number;
  is_active?: boolean | number;
}

// Convert quotation to job
export interface ConvertToJobRequest {
  quotation_id: number;
  due_date:     string;
  priority?:    JobPriority;
  remarks?:     string;
}

// Create direct job
export interface UpdateJobPreStartRequest {
  quantity?: number | null;
  material_id?: number | null;
  binding_id?: number | null;
  lamination_id?: number | null;
  front_color_pages?: number | null;
  back_color_pages?: number | null;
  cover_front_color_pages?: number | null;
  cover_back_color_pages?: number | null;
}
