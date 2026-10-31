import { Router } from 'express';
import healthRoutes from './health.routes';

const v1Router = Router();

// Register module routes under /api/v1
v1Router.use('/', healthRoutes);

export default v1Router;
