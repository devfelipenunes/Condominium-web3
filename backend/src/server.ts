import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT = parseInt(`${process.env.PORT}`) || 3001;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
