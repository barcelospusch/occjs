export class OccJSError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "OccJSError";
    this.status = status;
    this.details = details;
  }
}
