const express = require("express");
const mysql = require("mysql2");
const app = express();
app.use(express.json());

const db = mysql.createConnection({
  host: "auth-db",
  user: "root",
  password: "root",
  database: "auth_db"
});

app.post("/register", (req,res)=>{
  const {name,email,password}=req.body;
  db.query(
    "INSERT INTO users(name,email,password) VALUES (?,?,?)",
    [name,email,password],
    ()=>res.json({message:"Register berhasil"})
  );
});

app.post("/login",(req,res)=>{
  const {email,password}=req.body;
  db.query(
    "SELECT * FROM users WHERE email=? AND password=?",
    [email,password],
    (e,r)=>{
      if(r.length===0) return res.status(401).json({message:"Login gagal"});
      res.json(r[0]);
    }
  );
});

app.listen(3001,()=>console.log("Auth service 3001"));
