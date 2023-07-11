const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2/promise");
const PORT = 80;
const http = require("http");
const https = require("https");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const fs = require("fs");
// Certificate
const privateKey = fs.readFileSync(
  "/etc/letsencrypt/live/kisargo.ml/privkey.pem",
  "utf8"
);
const certificate = fs.readFileSync(
  "/etc/letsencrypt/live/kisargo.ml/cert.pem",
  "utf8"
);
const ca = fs.readFileSync(
  "/etc/letsencrypt/live/kisargo.ml/fullchain.pem",
  "utf8"
);
const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca,
};

// MySQL connection pool configuration
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "65109105@mysql",
  database: "docracy",
  connectionLimit: 10, // Set the maximum number of connections
});

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.use(cors());

// Secret key used to sign and verify JWT tokens
const secretKey = "docracy";

app.post("/api/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const result_rows = await executeQuery(
      `SELECT password from voter_credentials WHERE voter_id = (SELECT voter_id from voters WHERE email = '${email}')`
    );
    const stored_password = result_rows[0].password;
    bcrypt.compare(password, stored_password, (err, result) => {
      if (err) {
        res.status(500).json({ err: "COMPARE_ERR" });
        return;
      }

      if (result) {
        const token = jwt.sign({ email }, secretKey, { expiresIn: "3h" });
        res.status(200).json({ token });
      } else {
        res.status(401).json({ err: "CREDENTIAL_ERR" });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ err: "UNKOWN_ERR" });
  }
});

app.get('/api/verify-token', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, secretKey);
    console.log(decoded);
    res.sendStatus(200);
  } catch (error) {
    console.error('Token verification failed:', error);
    res.sendStatus(401);
  }
});

// Protected route
app.get('/api/user-data', authenticateToken, async (req, res) => {
  // You can access the authenticated user's information from the request object
  const { email } = req.email;
  try {
    let result_rows = await executeQuery(
      `SELECT first_name,last_name from voters WHERE email = '${email}'`
    );
    var userData = result_rows[0]; 
  }
   catch(err){
    console.log(err)
  }
  console.log(userData)
  res.json(userData);
});
app.get('/api/getCandidates', authenticateToken, async (req, res) => {
  try {
    let result_rows = await executeQuery(
      `SELECT * from candidates`
    );
    var candidates = result_rows; 
  }
   catch(err){
    res.status(500).json("ERROR")
  }
  console.log(candidates)
  res.json(candidates);
});

app.get('/api/checkIfUserVoted', authenticateToken, async (req, res) => {
  // You can access the authenticated user's information from the request object
  const { email } = req.email;
  try {
    let result_rows = await executeQuery(
      `SELECT 1 AS result from votes WHERE voter_id = (SELECT voter_id FROM voters WHERE email = '${email}')`
    );
    var userData = result_rows[0]; 
  }
   catch(err){
    console.log(err)
  }
  console.log(userData)
  res.json(userData);
});

app.get('/api/getVotesByPost/:post_id', async (req, res) => {
  // You can access the authenticated user's information from the request object
  const  post_id  = req.params.post_id;
  try {
    let result_rows = await executeQuery(
      `SELECT COUNT(*) AS no_of_votes FROM votes  WHERE post_id = ${post_id}`
    );
    var no_of_votes = result_rows[0]; 

  }
   catch(err){
    console.log(err)
  }
  console.log(no_of_votes)
  res.json(no_of_votes);
});

app.get('/api/getVotesByCandidateId/:candidate_id', async (req, res) => {
  // You can access the authenticated user's information from the request object
  const  candidate_id  = req.params.candidate_id;
  try {
    let result_rows = await executeQuery(
      `SELECT COUNT(*) AS no_of_votes FROM votes WHERE candidate_id = ${candidate_id}`
    );
    var no_of_votes = result_rows[0]; 

  }
   catch(err){
    console.log(err)
  }
  console.log(no_of_votes)
  res.json(no_of_votes);
});


app.post('/api/submitVotes', authenticateToken, async (req, res) => {
  // You can access the authenticated user's information from the request object
  const { email } = req.email;
  const voteData = JSON.parse(Object.keys(req.body)[0]);
  console.log(email);

  try {
    for (let i = 0; i < voteData.length; i++) {
      const { post_id, candidate_id } = voteData[i];
      await executeQuery(
        `INSERT INTO votes VALUES((SELECT voter_id FROM voters WHERE email = '${email}'), ${post_id}, ${candidate_id})`
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'An error occurred while submitting votes' });
  }
});


app.get('/api/getElectionStatus', authenticateToken, async (req, res) => {
  const currentDate = new Date();
  const options = { timeZone: 'Asia/Kolkata' };
  const currentDateInIndia = new Date(currentDate.toLocaleString('en-US', options));
  const live = isDateInRange(currentDateInIndia)
  console.log({isLive:live});
  res.json({isLive:live});
});

function isDateInRange(date) {
  const startDate = new Date('2023-07-11T00:00:00+05:30'); // Start date: July 8th, 2023, 00:00 IST
  const endDate = new Date('2023-07-12T23:59:59+05:30'); // End date: July 10th, 2023, 23:59 IST

  // Convert the input date to India timezone
  const inputDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  return inputDate >= startDate && inputDate <= endDate;
}

app.get("/.well-known/acme-challenge/:fileName", (req, res) => {
  res.setHeader("content-type", "text/plain");
  // Use fs.readFile() method to read the file
  res.send(
    fs.readFile(
      __dirname + "/.well-known/acme-challenge/" + req.params.fileName,
      "utf8",
      function (err, data) {
        // Display the file content
        return data;
      }
    )
  );
});
// Starting both http & https servers
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(PORT, () => {
  console.log("HTTP Server running on port 80");
});

httpsServer.listen(443, () => {
  console.log("HTTPS Server running on port 443");
});


// Middleware to authenticate the JWT token
function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  console.log(req.body)
  if (!token) {
    return res.sendStatus(401);
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, secretKey);
    // Attach the user information to the request object for later use
    req.email = decoded;
    req.body = req.body;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.sendStatus(401);
  }
}

// Async function for executing the SELECT query
async function executeQuery(sql) {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.execute(sql);
    connection.release(); // Release the connection back to the pool
    return rows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
}
