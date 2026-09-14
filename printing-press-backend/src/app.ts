import express from 'express';
import cors from 'cors';

import quotationRoutes from './routes/quotation.routes';
import jobRoutes from './routes/job.routes';
import customerRoutes from './routes/customer.routes';
import supplyRoutes from './routes/supply.routes';
import reportRoutes from './routes/report.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';   
import notificationRoutes from './routes/notification.routes';
import attendanceRoutes from './routes/attendance.routes';
import path from 'path';
import artworkRoutes from './routes/artwork.routes';
import productionRoutes from './routes/production.routes';



const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);               
app.use('/api/quotations', quotationRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/supplies', supplyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/attendance', attendanceRoutes);


app.get('/uploads/artwork/:filename/download', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(process.cwd(), 'uploads', 'artwork', filename);
  res.download(filePath, filename, err => {
    if (err && !res.headersSent) res.status(404).json({ message: 'Artwork file is missing. Please re-upload it.' });
  });
});
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/artwork', artworkRoutes);
app.use('/api/production', productionRoutes);
export default app;
