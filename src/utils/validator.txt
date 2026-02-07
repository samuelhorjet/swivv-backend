import Joi from "joi";
import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "./response.js";

export const schemas = {
  userSync: Joi.object({
    token: Joi.string().required(),
    username: Joi.string().alphanum().min(3).max(20).optional(),
  }),
  
  resolvePool: Joi.object({
    pool_id: Joi.number().integer().required(),
    price: Joi.number().positive().required()
  })
};

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(", ");
      return ApiResponse.validationError(res, errorMessage);
    }

    next();
  };
};