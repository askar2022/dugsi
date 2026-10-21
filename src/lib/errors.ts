export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function throwIfError(error: { message: string } | null, fallback: string) {
  if (error) {
    throw new ApiError(error.message || fallback, 400);
  }
}
