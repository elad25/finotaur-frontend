// finotaur-server/src/index.mount-snippet.ts
import express from "express";
import fundamentalsRouter from "./routes/fundamentals";

const app = express();

// מפה נכון: '/api/fundamentals' + '/all' בתוך הראוטר => '/api/fundamentals/all'
app.use("/api/fundamentals", fundamentalsRouter);
