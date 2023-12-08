import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";
import errorMiddleware from "./middlewares/errorMiddleware";
import residentRouter from "./routes/residentRouter";
import authController from "./controllers/authController";

const app = express();

app.use(morgan("tiny"));
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
  })
);

app.use(express.json());

app.post("/login/", authController.doLogin);

app.use("/resident", residentRouter);
app.use("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("Hello World!");
});

app.use(errorMiddleware);

export default app;
