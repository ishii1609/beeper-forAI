import dns from 'node:dns'
dns.setServers(['8.8.8.8', '8.8.4.4']);

import "dotenv/config";

import app from './src/app.js'
import connectDB from './src/db/Db.js'
connectDB()
const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>{ console.log("Server is running on port", PORT) })