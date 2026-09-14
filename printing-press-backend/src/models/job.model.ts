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
  customer_name?:   string;   // joined from customer table
  quantity?:        number;
  width?:           number;
  height?:          number;
  pages?:           number;
  material_id?:     number | null;
  material?:        string;
  binding_id?:      number | null;
  lamination_id?:   number | null;
  machine_id?:      number | null;
  machine_name?:    string;   // joined from machine table
  priority?:        JobPriority;
  quotation_id?:    number | null;
  status?:          JobStatus;
  due_date?:        string;
  created_at?:      string;
}

// Matches job_stage_log table exactly
export interface JobStageLog {
  log_id?:    number;
  job_id:     number;
  stage:      string;
  status:     string;
  remarks?:   string;
  timestamp?: string;
}

// What frontend sends to create a job from quotation
export interface ConvertToJobRequest {
  quotation_id: number;
  due_date:     string;
  priority?:    JobPriority;
  remarks?:     string;
}

