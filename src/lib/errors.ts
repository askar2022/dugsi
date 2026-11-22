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

export function isMissingRelation(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return text.includes("42p01") || text.includes("does not exist") || text.includes("could not find the table");
}
