import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { registerSchema, loginSchema, updateProfileSchema } from '../schemas/userSchemas';

export function createUserRouter(): Router {
  const router = Router();
  const controller = new UserController();

  router.post('/register', validate(registerSchema, 'body'), controller.register);
  router.post('/login', validate(loginSchema, 'body'), controller.login);
  router.get('/profile', authenticate, controller.getProfile);
  router.put('/profile', authenticate, validate(updateProfileSchema, 'body'), controller.updateProfile);
  router.get('/health', controller.health);

  return router;
}
