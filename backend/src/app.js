import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import { config } from "./config/index.js";

import { errorHandler } from "./middleware/error.middleware.js";
import { notFoundHandler } from "./middleware/notFound.middleware.js";
import { ErrorMiddleware } from "./middleware/errorMiddleware.js";

const app = express();

// CORS
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  }),
);

app.use(express.json());
app.use(cookieParser());
// Minh chứng phản hồi lương chỉ được tải qua API có kiểm tra ownership/RBAC.
app.use("/uploads/payroll-feedbacks", (req, res) => res.status(404).end());
app.use("/uploads", express.static("uploads"));

app.use("/api", routes);

// Route không tồn tại
app.use(notFoundHandler);
// Middleware xử lý lỗi
// app.use(errorHandler);
app.use(ErrorMiddleware);
export default app;
