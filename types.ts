export interface Employee {
  rtx_id: string;
  name: string;
}

export interface Group {
  name: string;
  employees: Employee[];
  groups: Group[]; // Recursive structure
}

export interface RelationResponse {
  name: string; // Root name usually
  employees: Employee[];
  groups: Group[];
}

export interface Task {
  priority: string; // e.g., "P1", "P3"
  task_id: string;
  title: string;
  type: string; // e.g., "子项目管理", "产品需求"
  work_hour: string;
  status: string; // e.g., "support", "coding"
  parent?: '1' | '2' | null; // 1=父项目, 2=子项目, null=未知
}

export interface DailyPlan {
  task_count: number;
  tasks: Task[];
}

export interface EmployeePlan {
  rtx_id: string;
  name: string;
  department: string;
  daily_plans: Record<string, DailyPlan>; // Key is date YYYY-MM-DD
}

export interface WorkPlan {
  period: {
    start_date: string;
    end_date: string;
  };
  employees: EmployeePlan[];
}

export interface PlanResponse {
  org_tree: any; // Simplified for now as we use WorkPlan mostly
  work_plan: WorkPlan;
}

export interface DateColumn {
  dateStr: string; // YYYY-MM-DD
  dayName: string; // "周三", "周四"
  isWeekend: boolean;
  displayDate: string; // MM/DD
}