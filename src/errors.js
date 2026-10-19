export class OccJSError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "OccJSError";
    this.status = status;
    this.details = details;
  }
}

export class InvalidDatetimeFormatError extends OccJSError {
  constructor(
    message = "The provided string does not match the accepted date/datetime format.",
  ) {
    const examples = [
      "Date only:                 YYYY-MM-DD",
      "Date, hour, and minute:    YYYY-MM-DDTHH:MM",
      "Date and time (UTC):       YYYY-MM-DDTHH:MM:SSZ",
      "Date and time with offset: YYYY-MM-DDTHH:MM:SS±HH:MM",
    ];
    super(`${message}\nAccepted formats:\n${examples.join("\n")}`);
    this.name = "InvalidDatetimeFormatError";
    this.examples = examples;
  }
}
