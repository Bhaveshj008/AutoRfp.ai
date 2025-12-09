// utils/errorUtils.js

exports.sanitizeError = (error) => {
  const sensitivePatterns = [
    // ====================== DB/ORM/Internal ======================
    "sequelize",
    "pg",
    "mysql",
    "mssql",
    "oracle",
    "sqlite",
    "database",
    "sql",
    "query failed",
    "syntax error",
    "relation",
    "column",
    "table",
    "row",
    "not null",
    "unique constraint",
    "foreign key",
    "primary key",
    "insert into",
    "delete from",
    "update set",
    "select *",
    "transaction",
    "rollback",
    "commit",
    "undefined",
    "findOne",

    // ====================== Network ======================
    "econnrefused",
    "etimedout",
    "getaddrinfo",
    "enotfound",
    "tcp",
    "dns",

    // ====================== AWS/Internal Cloud ======================
    "aws",
    "rds",
    "s3",
    "lambda",
    "dynamodb",
    "iam",

    // ====================== Auth/Token ======================
    "token",
    "jwt",
    "bearer",
    "unauthorized",
    "invalid signature",
    "csrf",
    "xss",

    // ====================== File/Runtime ======================
    "fs.",
    "enoent",
    "readfile",
    "unlink",
    "permission denied",
    "disk",
    "no such file",
    "unexpected token",
    "read ECONNRESET",
    "with ID",
    "tenant database",
    "tenant connection",
    "with id 'password'",
    "tenant",
    "shared",
  ];

  const message = error?.message || "";
  const lowerMsg = message.toLowerCase();

  const matchedPatterns = sensitivePatterns.filter((pattern) =>
    lowerMsg.includes(pattern)
  );

  const isSensitive = matchedPatterns.length > 0;

  return {
    isSensitive,
    message: isSensitive
      ? "Something went wrong. Please try again later."
      : message || "Something went wrong.",
    statusCode: isSensitive ? 500 : 400,
  };
};
