import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  registerValidator,
  loginValidator,
} from "../validators/auth.validator.js";

const router = Router();

router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.get("/me", authenticate, getMe);

export default router;
