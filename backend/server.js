import dns from 'node:dns'
dns.setServers(['8.8.8.8', '8.8.4.4']);

import "dotenv/config";

import app from './src/app.js'
import connectDB from './src/db/Db.js'
connectDB()
app.listen(5000,()=>{
    console.log("Server is running on port 5000")
})