"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../config/db"));
const DEMO_PASSWORD = 'Demo@123';
async function main() {
    const connection = await db_1.default.getConnection();
    try {
        await connection.beginTransaction();
        const roleIds = new Map();
        const [roles] = await connection.query('SELECT role_id, role_name FROM role');
        for (const role of roles)
            roleIds.set(role.role_name, role.role_id);
        for (const requiredRole of ['Admin', 'Manager', 'Operator']) {
            if (!roleIds.has(requiredRole))
                throw new Error(`Missing required role: ${requiredRole}`);
        }
        const passwordHash = await bcryptjs_1.default.hash(DEMO_PASSWORD, 10);
        const demoUsers = [
            ['Viva Admin', 'demo.admin@press.local', 'Admin'],
            ['Viva Manager', 'demo.manager@press.local', 'Manager'],
            ['Nimal Perera', 'demo.operator1@press.local', 'Operator'],
            ['Saman Kumara', 'demo.operator2@press.local', 'Operator'],
        ];
        const userIds = new Map();
        for (const [name, email, role] of demoUsers) {
            await connection.query(`INSERT INTO users (full_name, email, password, role_id, is_active)
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           full_name = VALUES(full_name), password = VALUES(password),
           role_id = VALUES(role_id), is_active = 1`, [name, email, passwordHash, roleIds.get(role)]);
            const [rows] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
            userIds.set(email, rows[0].id);
        }
        const customers = [
            ['Lanka Book House', '0770001001', 'orders@lankabooks.demo', 'Colombo 03', '0770001001', 'Active'],
            ['Bright Future Academy', '0770001002', 'office@brightfuture.demo', 'Kaduwela', '0770001002', 'Active'],
            ['Green Leaf Cafe', '0770001003', 'hello@greenleaf.demo', 'Battaramulla', '0770001003', 'Lead'],
            ['City Events Lanka', '0770001004', 'info@cityevents.demo', 'Nugegoda', '0770001004', 'Active'],
        ];
        const customerIds = new Map();
        for (const customer of customers) {
            await connection.query(`INSERT INTO customer (name, phone, email, address, whatsapp, status)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name), phone = VALUES(phone), address = VALUES(address),
           whatsapp = VALUES(whatsapp), status = VALUES(status)`, [...customer]);
            const [rows] = await connection.query('SELECT customer_id AS id FROM customer WHERE email = ?', [customer[2]]);
            customerIds.set(customer[2], rows[0].id);
        }
        const [materials] = await connection.query('SELECT material_id FROM material ORDER BY material_id LIMIT 1');
        const [bindings] = await connection.query('SELECT binding_id FROM binding_type ORDER BY binding_id LIMIT 1');
        const [laminations] = await connection.query('SELECT lamination_id FROM lamination_type ORDER BY lamination_id LIMIT 1');
        const [machines] = await connection.query('SELECT machine_id FROM machine WHERE is_active = 1 ORDER BY machine_id LIMIT 2');
        if (!materials.length || !bindings.length || !laminations.length || !machines.length) {
            throw new Error('Seed requires at least one material, binding type, lamination type, and active machine.');
        }
        const materialId = materials[0].material_id;
        const bindingId = bindings[0].binding_id;
        const laminationId = laminations[0].lamination_id;
        const machine1 = machines[0].machine_id;
        const machine2 = machines[1]?.machine_id ?? machine1;
        const quotations = [
            { no: 'DEMO-Q-001', customer: 'orders@lankabooks.demo', name: 'A5 Story Books', type: 'book', qty: 500, pages: 64, base: 48000, extra: 2500, margin: 15, total: 58075, status: 'CONFIRMED' },
            { no: 'DEMO-Q-002', customer: 'office@brightfuture.demo', name: 'School Prospectus', type: 'book', qty: 300, pages: 32, base: 32500, extra: 1800, margin: 12, total: 38416, status: 'CONFIRMED' },
            { no: 'DEMO-Q-003', customer: 'hello@greenleaf.demo', name: 'Cafe Promotional Leaflets', type: 'leaflet', qty: 1000, pages: 2, base: 18000, extra: 1000, margin: 10, total: 20900, status: 'PENDING' },
            { no: 'DEMO-Q-004', customer: 'info@cityevents.demo', name: 'Event Programme', type: 'book', qty: 250, pages: 24, base: 26000, extra: 1500, margin: 10, total: 30250, status: 'DRAFT' },
            { no: 'DEMO-Q-005', customer: 'orders@lankabooks.demo', name: 'Cancelled Poster Order', type: 'leaflet', qty: 200, pages: 1, base: 9000, extra: 500, margin: 10, total: 10450, status: 'CANCELLED' },
            { no: 'DEMO-Q-006', customer: 'office@brightfuture.demo', name: 'Annual Prize Day Book', type: 'book', qty: 400, pages: 48, base: 41000, extra: 2000, margin: 12, total: 48160, status: 'CONFIRMED' },
        ];
        const quotationIds = new Map();
        for (const q of quotations) {
            const customerId = customerIds.get(q.customer);
            await connection.query(`INSERT INTO quotation
           (quotation_number, customer_id, base_cost, extra_charges, profit_margin, total_cost, status, dateCreated, job_name, job_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL 7 DAY), ?, ?)
         ON DUPLICATE KEY UPDATE
           customer_id = VALUES(customer_id), base_cost = VALUES(base_cost),
           extra_charges = VALUES(extra_charges), profit_margin = VALUES(profit_margin),
           total_cost = VALUES(total_cost), status = VALUES(status),
           job_name = VALUES(job_name), job_type = VALUES(job_type)`, [q.no, customerId, q.base, q.extra, q.margin, q.total, q.status, q.name, q.type]);
            const [rows] = await connection.query('SELECT id FROM quotation WHERE quotation_number = ?', [q.no]);
            const quotationId = rows[0].id;
            quotationIds.set(q.no, quotationId);
            await connection.query(`INSERT INTO quotation_item
           (quotation_id, description, quantity, width, height, pages, front_color_pages,
            back_color_pages, cover_front_color_pages, cover_back_color_pages,
            material_id, binding_id, lamination_id, total_cost)
         VALUES (?, ?, ?, 8.27, 11.69, ?, 4, 4, 4, 4, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           description = VALUES(description), quantity = VALUES(quantity), pages = VALUES(pages),
           material_id = VALUES(material_id), binding_id = VALUES(binding_id),
           lamination_id = VALUES(lamination_id), total_cost = VALUES(total_cost)`, [quotationId, q.name, q.qty, q.pages, materialId, q.type === 'book' ? bindingId : null, laminationId, q.total]);
        }
        const jobs = [
            { no: 'DEMO-J-001', quote: 'DEMO-Q-001', status: 'COMPLETED', priority: 'MEDIUM', machine: machine1, scheduled: -5, due: -1 },
            { no: 'DEMO-J-002', quote: 'DEMO-Q-002', status: 'BINDING', priority: 'URGENT', machine: machine2, scheduled: 0, due: 2 },
            { no: 'DEMO-J-003', quote: 'DEMO-Q-006', status: 'PRINTING', priority: 'MEDIUM', machine: machine1, scheduled: 1, due: 5 },
        ];
        const jobIds = new Map();
        for (const job of jobs) {
            const q = quotations.find(item => item.no === job.quote);
            const quotationId = quotationIds.get(job.quote);
            const customerId = customerIds.get(q.customer);
            await connection.query(`INSERT INTO job_ticket
           (job_number, job_name, job_type, customer_id, quantity, width, height, pages,
            material_id, binding_id, lamination_id, machine_id, priority, quotation_id,
            status, due_date, scheduled_date, completed_at)
         VALUES (?, ?, ?, ?, ?, 8.27, 11.69, ?, ?, ?, ?, ?, ?, ?, ?,
                 DATE_ADD(CURDATE(), INTERVAL ? DAY), DATE_ADD(CURDATE(), INTERVAL ? DAY),
                 IF(? = 'COMPLETED', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL))
         ON DUPLICATE KEY UPDATE
           job_name = VALUES(job_name), customer_id = VALUES(customer_id), quantity = VALUES(quantity),
           pages = VALUES(pages), material_id = VALUES(material_id), binding_id = VALUES(binding_id),
           lamination_id = VALUES(lamination_id), machine_id = VALUES(machine_id),
           priority = VALUES(priority), status = VALUES(status), due_date = VALUES(due_date),
           scheduled_date = VALUES(scheduled_date), completed_at = VALUES(completed_at)`, [job.no, q.name, q.type, customerId, q.qty, q.pages, materialId,
                q.type === 'book' ? bindingId : null, laminationId, job.machine, job.priority,
                quotationId, job.status, job.due, job.scheduled, job.status]);
            const [rows] = await connection.query('SELECT job_id AS id FROM job_ticket WHERE job_number = ?', [job.no]);
            jobIds.set(job.no, rows[0].id);
        }
        for (const jobId of jobIds.values()) {
            await connection.query('DELETE FROM job_stage_log WHERE job_id = ?', [jobId]);
            await connection.query('DELETE FROM job_assignment WHERE job_id = ?', [jobId]);
            await connection.query('DELETE FROM machine_assignment WHERE job_id = ?', [jobId]);
        }
        const completedJobId = jobIds.get('DEMO-J-001');
        for (const stage of ['PRINTING', 'CUTTING', 'FOLDING', 'BINDING', 'PACKING', 'COMPLETED']) {
            await connection.query(`INSERT INTO job_stage_log (job_id, stage, status, remarks, timestamp)
         VALUES (?, ?, 'COMPLETED', 'Demo workflow completed successfully', DATE_SUB(NOW(), INTERVAL 1 DAY))`, [completedJobId, stage]);
        }
        const activeJobId = jobIds.get('DEMO-J-002');
        for (const stage of ['PRINTING', 'CUTTING', 'FOLDING']) {
            await connection.query(`INSERT INTO job_stage_log (job_id, stage, status, remarks)
         VALUES (?, ?, 'COMPLETED', 'Completed during demo production')`, [activeJobId, stage]);
        }
        await connection.query(`INSERT INTO job_stage_log (job_id, stage, status, remarks)
       VALUES (?, 'BINDING', 'STARTED', 'Binding is currently in progress')`, [activeJobId]);
        const operator1 = userIds.get('demo.operator1@press.local');
        const operator2 = userIds.get('demo.operator2@press.local');
        await connection.query(`INSERT INTO job_assignment (job_id, user_id, machine_id, assigned_date, started_at)
       VALUES (?, ?, ?, NOW(), NOW())`, [activeJobId, operator1, machine2]);
        await connection.query(`INSERT INTO machine_assignment (job_id, machine_id, assigned_date)
       VALUES (?, ?, CURDATE()), (?, ?, DATE_ADD(CURDATE(), INTERVAL 1 DAY))`, [activeJobId, machine2, jobIds.get('DEMO-J-003'), machine1]);
        for (const [operator, machine] of [[operator1, machine2], [operator2, machine1]]) {
            await connection.query(`INSERT INTO operator_attendance (user_id, attendance_date, is_present)
         VALUES (?, CURDATE(), 1)
         ON DUPLICATE KEY UPDATE is_present = 1`, [operator]);
            await connection.query(`INSERT INTO machine_daily_assignment (machine_id, user_id, assignment_date)
         VALUES (?, ?, CURDATE())
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`, [machine, operator]);
        }
        const managerId = userIds.get('demo.manager@press.local');
        await connection.query(`DELETE FROM notification WHERE user_id = ? AND message LIKE '[DEMO]%'`, [managerId]);
        await connection.query(`INSERT INTO notification (user_id, message, type, is_read)
       VALUES
         (?, '[DEMO] Urgent School Prospectus job is now in binding.', 'STATUS_UPDATE', 0),
         (?, '[DEMO] A5 Story Books job was completed successfully.', 'STATUS_UPDATE', 1)`, [managerId, managerId]);
        await connection.commit();
        console.log('Demo data seeded successfully.');
        console.log('Logins (all use password Demo@123):');
        for (const [, email, role] of demoUsers)
            console.log(`  ${role}: ${email}`);
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
        await db_1.default.end();
    }
}
main().catch((error) => {
    console.error('Demo seed failed:', error);
    process.exit(1);
});
