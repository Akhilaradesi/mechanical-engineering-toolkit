import { HttpError } from "./httpError.js";

export const toPositiveNumber = (value, fieldName) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive number.`);
  }

  return numericValue;
};

export const toBoolean = (value) => Boolean(value);
