export class DateRangeError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "DateRangeError";
  }
}

export function parseDateRange(query: { from?: string; to?: string }): {
  startDate: Date;
  endDate: Date;
} {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (query.from) {
    startDate = new Date(query.from);
    if (isNaN(startDate.getTime())) {
      throw new DateRangeError(
        "Invalid 'from' date format. Use ISO 8601 datetime strings.",
        "from",
      );
    }
  }

  if (query.to) {
    endDate = new Date(query.to);
    if (isNaN(endDate.getTime())) {
      throw new DateRangeError(
        "Invalid 'to' date format. Use ISO 8601 datetime strings.",
        "to",
      );
    }
  }

  if (startDate && endDate && startDate > endDate) {
    throw new DateRangeError(
      "The 'from' date must be before or equal to the 'to' date.",
    );
  }

  return {
    startDate: startDate || new Date(0),
    endDate: endDate || new Date(),
  };
}

export function buildDateFilter(
  startDate: Date,
  endDate: Date,
): { createdAt: { $gte: Date; $lte: Date } } {
  return {
    createdAt: { $gte: startDate, $lte: endDate },
  };
}
