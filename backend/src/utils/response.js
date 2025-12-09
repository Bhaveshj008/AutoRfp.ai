function successResponse(statusCode, message, data) {
  const finalMessage =
    typeof message === 'object' && message.message ? message.message : message;

  return {
    success: true,
    statusCode,
    message: finalMessage,
    data,
  };
}

function errorResponse(statusCode, message, details = null) {
  return {
    success: false,
    statusCode,
    error: message,
    ...(details && { details }),
  };
}

module.exports = {
  successResponse,
  errorResponse,
};
