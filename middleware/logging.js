const logRequest = (req, res, next) => {
  const start = Date.now();

  // Log after the response is sent
  res.on("finish", () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const status = res.statusCode;
    const userId = req.user ? req.user.id : "anonymous";

    console.log(
      `[${timestamp}] ${method} ${url} ${status} - ${duration}ms (User: ${userId})`
    );

    // Optionally log request body for POST/PUT requests (excluding sensitive data like passwords)
    if (["POST", "PUT"].includes(method) && req.body) {
      const safeBody = { ...req.body };
      if (safeBody.password) safeBody.password = "***";
      console.log(`Request Body: ${JSON.stringify(safeBody)}`);
    }
  });

  next();
};

module.exports = logRequest;
