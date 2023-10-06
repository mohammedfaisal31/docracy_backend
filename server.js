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
const nodemailer = require("nodemailer");
const axios = require("axios");

//NodeMailer
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "verify.kisarpay@gmail.com",
    pass: "tabzmuksfwnlpndo",
  },
  pool: true,
});

// Certificate
const privateKey = fs.readFileSync(
  "/etc/letsencrypt/live/lyxnlabsapi.online/privkey.pem",
  "utf8"
);
const certificate = fs.readFileSync(
  "/etc/letsencrypt/live/lyxnlabsapi.online/cert.pem",
  "utf8"
);
const ca = fs.readFileSync(
  "/etc/letsencrypt/live/lyxnlabsapi.online/fullchain.pem",
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
  password: "65109@mysql",
  database: "docracy",
  connectionLimit: 10, // Set the maximum number of connections
});

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.use(cors());

// Secret key used to sign and verify JWT tokens
const secretKey = "docracy";

app.post("/api/checkIfUserExists", async (req, res) => {
  const identifier = req.body.identifier;
  console.log("Identifier", identifier);
  try {
    const result = await executeQuery(
      `SELECT *
      FROM voters
      WHERE phone = '${identifier}' OR email = '${identifier}';
      `
    );
    if (result.length > 0) {
      if (identifyIdentifierType(identifier) == "email") {
        const token = jwt.sign({ email: identifier }, secretKey, {
          expiresIn: "3h",
        });
        res.status(200).json({ token, identifier_type: "email" });
      } else if (identifyIdentifierType(identifier) == "phone") {
        const [result] = await executeQuery(
          `SELECT email
            FROM voters
            WHERE phone = '${identifier}';
            `
        );
        console.log(typeof result.email);
        const token = jwt.sign({ email: result.email }, secretKey, {
          expiresIn: "3h",
        });
        res.status(200).json({ token: token, identifier_type: "phone" });
      } else {
        res.status(500).json({ err: "UNKOWN_ERR" });
      }
    } else {
      res.status(401).json({ err: "CREDENTIAL_ERR" });
    }
  } catch (error) {
    res.status(500).json({ err: "UNKOWN_ERR" });
  }
});

app.get("/api/verify-token", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.sendStatus(401);
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, secretKey);
    res.status(200).json({ decoded });
  } catch (error) {
    res.sendStatus(401);
  }
});

// Protected route
app.get("/api/user-data", authenticateToken, async (req, res) => {
  // You can access the authenticated user's information from the request object
  const { email } = req.email;
  try {
    let result_rows = await executeQuery(
      `SELECT first_name,last_name from voters WHERE email = '${email}'`
    );
    var userData = result_rows[0];
  } catch (err) {
    console.log(err);
  }
  res.json(userData);
});
app.get("/api/getCandidates", authenticateToken, async (req, res) => {
  try {
    let result_rows = await executeQuery(`SELECT * from candidates`);
    var candidates = result_rows;
  } catch (err) {
    res.status(500).json("ERROR");
  }
  res.json(candidates);
});

app.get("/api/checkIfUserVoted", authenticateToken, async (req, res) => {
  // You can access the authenticated user's information from the request object
  const { email } = req.email;
  try {
    let result_rows = await executeQuery(
      `SELECT 1 AS result from votes WHERE voter_id = (SELECT voter_id FROM voters WHERE email = '${email}')`
    );
    var userData = result_rows[0];
  } catch (err) {
    console.log(err);
  }
  res.json(userData);
});

app.get("/api/getVotesByPost/:post_id", async (req, res) => {
  const post_id = req.params.post_id;
  try {
    let result_rows = await executeQuery(
      `SELECT candidate_id, COUNT(*) AS no_of_votes FROM votes WHERE post_id = ${post_id} GROUP BY candidate_id`
    );
    const voteCounts = result_rows.map((row) => ({
      candidate_id: row.candidate_id,
      no_of_votes: row.no_of_votes,
    }));

    res.json(voteCounts);
  } catch (err) {
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get(
  "/api/getVotesByCandidateId/:post_id/:candidate_id",
  async (req, res) => {
    // You can access the authenticated user's information from the request object
    const candidate_id = req.params.candidate_id;
    const post_id = req.params.post_id;

    try {
      let result_rows = await executeQuery(
        `SELECT COUNT(*) AS no_of_votes FROM votes WHERE candidate_id = ${candidate_id} AND post_id = ${post_id}`
      );
      var no_of_votes = result_rows[0];
    } catch (err) {
      console.log(err);
    }
    res.json(no_of_votes);
  }
);

app.get("/api/getTotalVotes", async (req, res) => {
  try {
    let result_rows = await executeQuery(
      `SELECT COUNT(*) AS no_of_votes FROM votes`
    );
    var no_of_votes = result_rows[0];
  } catch (err) {
    console.log(err);
  }
  res.json(no_of_votes);
});
app.get("/api/getTotalVotes/:post_id", async (req, res) => {
  const post_id = req.params.post_id;
  try {
    let result_rows = await executeQuery(
      `SELECT COUNT(*) AS no_of_votes FROM votes WHERE post_id = ${post_id}`
    );
    var no_of_votes = result_rows[0];
  } catch (err) {
    console.log(err);
  }
  res.json(no_of_votes);
});

app.get("/api/getTotalVotesListPastSevenDays", async (req, res) => {
  try {
    let result_rows = await executeQuery(
      `SELECT
      DAYNAME(created_at) AS voting_day,
      COUNT(*) AS total_votes
  FROM
      votes
  WHERE
      DATE(created_at) >= CURDATE() - INTERVAL 6 DAY
  GROUP BY
      voting_day
  ORDER BY
      MIN(created_at) ASC;
  
  `
    );
    var results = result_rows;
  } catch (err) {
    console.log(err);
  }
  res.json(results);
});
app.get("/api/getTotalVotes/:post_id", async (req, res) => {
  const post_id = req.params.post_id;
  try {
    let result_rows = await executeQuery(
      `SELECT COUNT(*) AS no_of_votes FROM votes WHERE post_id = ${post_id}`
    );
    var no_of_votes = result_rows[0];
  } catch (err) {
    console.log(err);
  }
  res.json(no_of_votes);
});
app.get("/api/getAllVotes", async (req, res) => {
  try {
    let result_rows = await executeQuery(
      `SELECT
        CONCAT(vs.first_name, ' ', vs.last_name) AS voter_name,
        p.post_name,
        CONCAT(c.first_name, ' ', c.last_name) AS candidate_name,
        UNIX_TIMESTAMP(v.created_at) * 1000 AS created_at_timestamp
      FROM
        votes v
      JOIN
        voters vs ON v.voter_id = vs.voter_id
      JOIN
        posts p ON v.post_id = p.post_id
      JOIN
        voters c ON v.candidate_id = c.voter_id;
    `
    );
    var result = result_rows.map((row) => ({
      ...row,
      created_at: new Date(row.created_at_timestamp),
    }));
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "An error occurred" });
    return;
  }
  res.json(result);
});
app.get(
  "/api/getAllCandidatesVoteDistributionByPostId/:post_id",
  async (req, res) => {
    const post_id = req.params.post_id;
    try {
      var result_rows = await executeQuery(
        `SELECT
      c.candidate_id,
      CONCAT(c.first_name, ' ', c.last_name) AS candidate_fullname,
      c.email AS candidate_email,
      p.post_name,
      COUNT(*) AS total_votes,
      DENSE_RANK() OVER (PARTITION BY c.post_id ORDER BY COUNT(*) DESC) AS candidate_rank
  FROM
      votes v
  JOIN
      candidates c ON v.candidate_id = c.candidate_id
  JOIN
      posts p ON c.post_id = p.post_id
  WHERE
      c.post_id = ${post_id}
  GROUP BY
      v.candidate_id, c.candidate_id, p.post_name, c.post_id
  ORDER BY
      candidate_rank ASC;
  
    `
      );
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: "An error occurred" });
      return;
    }
    res.json(result_rows);
  }
);
app.get("/api/getVotersDataByPostId/:post_id", async (req, res) => {
  const post_id = req.params.post_id;
  try {
    var result_rows = await executeQuery(
      `SELECT
        CONCAT(v.first_name, ' ', v.last_name) AS voter_fullName,
        v.email AS voter_email,
        v.phone AS voter_phone,
        IF(COUNT(vt.candidate_id) > 0, 'Yes', 'No') AS if_has_voted,
        IF(COUNT(vt.candidate_id) > 0, GROUP_CONCAT(CONCAT(c.first_name, ' ', c.last_name) SEPARATOR ', '), 'N/A') AS candidate_names_voted_for
    FROM
        voters v
    LEFT JOIN
        votes vt ON v.voter_id = vt.voter_id
    LEFT JOIN
        candidates c ON vt.candidate_id = c.candidate_id
    WHERE
        vt.post_id = ${post_id}
    GROUP BY
        v.voter_id;
  
    `
    );
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "An error occurred" });
    return;
  }
  res.json(result_rows);
});

app.get("/api/getPercentageChangeFromYday/:post_id", async (req, res) => {
  const post_id = req.params.post_id;
  try {
    let result_rows = await executeQuery(
      `SELECT 
      (today_votes.total_votes - yesterday_votes.total_votes) / yesterday_votes.total_votes * 100 AS percentage_difference
  FROM
      (SELECT 
           COUNT(*) AS total_votes
       FROM 
           votes
       WHERE 
           DATE(created_at) = CURDATE() AND post_id = ${post_id}) AS today_votes,
      (SELECT 
           COUNT(*) AS total_votes
       FROM 
           votes
       WHERE 
           DATE(created_at) = CURDATE() - INTERVAL 1 DAY AND post_id = ${post_id} ) AS yesterday_votes;
  
  
  `
    );
    var percentage_change = result_rows[0];
  } catch (err) {
    console.log(err);
  }
  res.json(percentage_change);
});

app.get("/api/totalVotesPercentageFromYday", async (req, res) => {
  try {
    let result_rows = await executeQuery(
      `SELECT 
      (today_votes.total_votes - yesterday_votes.total_votes) / yesterday_votes.total_votes * 100 AS percentage_difference
  FROM
      (SELECT 
           COUNT(*) AS total_votes
       FROM 
           votes
       WHERE 
           DATE(created_at) = CURDATE()) AS today_votes,
      (SELECT 
           COUNT(*) AS total_votes
       FROM 
           votes
       WHERE 
           DATE(created_at) = CURDATE() - INTERVAL 1 DAY) AS yesterday_votes;
  
  `
    );
    var percentage_change = result_rows[0];
  } catch (err) {
    console.log(err);
  }
  res.json({ percentage_change: percentage_change });
});

app.post("/api/getAllNamesByCandidateIdList/", async (req, res) => {
  const candidate_id_list = req.body.candidate_id_list;

  try {
    const result_rows = await Promise.all(
      candidate_id_list.map(async (candidate_id) => {
        const result_row = await executeQuery(
          `SELECT first_name, last_name FROM candidates WHERE candidate_id = ${candidate_id}`
        );
        return result_row[0];
      })
    );

    res.json(result_rows);
  } catch (err) {
    res.status(500).json({ error: "An error occurred" });
  }
});

app.post("/api/submitVotes", authenticateToken, async (req, res) => {
  // You can access the authenticated user's information from the request object
  const { email } = req.email;
  const voteData = JSON.parse(Object.keys(req.body)[0]);

  try {
    for (let i = 0; i < voteData.length; i++) {
      const { post_id, candidate_id } = voteData[i];
      await executeQuery(
        `INSERT INTO votes(voter_id, post_id, candidate_id) VALUES((SELECT voter_id FROM voters WHERE email = '${email}'), ${post_id}, ${candidate_id})`
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "An error occurred while submitting votes" });
  }
});
app.post("/api/verifyOTP", authenticateToken, async (req, res) => {
  // You can access the authenticated user's information from the request object
  const { email } = req.email;
  const otp_code = req.body.otp_code;

  try {
    const query = `SELECT 1 AS compare FROM otp WHERE otp_code = '${otp_code}' AND voter_id = (SELECT voter_id from voters WHERE email = '${email}')`;
    const [compare] = await executeQuery(query);
    console.log("compare", compare);
    if (compare) res.status(200).json({ success: true });
    else res.status(401).json({ success: false });
  } catch (err) {
    res.status(500).json({ error: "An error occurred while comparing" });
  }
});
app.delete("/api/deleteOTP", authenticateToken, async (req, res) => {
  // You can access the authenticated user's information from the request object
  const { email } = req.email;
  const otp_code = req.body.otp_code;

  try {
    const query = `DELETE FROM otp WHERE voter_id = (SELECT voter_id FROM voters WHERE email = '${email}')`;
    const result = await executeQuery(query);

    if (result) res.status(200).json({ success: true });
    else res.status(401).json({ success: false });
  } catch (err) {
    res.status(500).json({ error: "An error occurred while deleting otp" });
  }
});

app.get("/api/getElectionStatus", authenticateToken, async (req, res) => {
  const currentDate = new Date();
  const options = { timeZone: "Asia/Kolkata" };
  const currentDateInIndia = new Date(
    currentDate.toLocaleString("en-US", options)
  );
  const live = isDateInRange(currentDateInIndia);
  res.json({ isLive: live });
});

app.post("/api/sendPhoneOTP", authenticateToken, async (req, res) => {
  const { email } = req.email;
  console.log(email);
  const [phoneNumber] = await executeQuery(
    `SELECT phone FROM voters WHERE email = '${email}'`
  );
  console.log(phoneNumber.phone);
  const otp = generateFourDigitOTP();
  const url = " https://www.fast2sms.com/dev/bulkV2";
  const headers = {
    authorization:
      "dXly23iHMNk87nv1QS4pueKDoZqtAE5WTzcPURBxfbhgj9CmLONAgGq5l9bc2dkru0WzeKBOMofYXw1I",
    "Content-Type": "application/json",
  };
  const body = {
    route: "otp",
    variables_values: `${otp}`,
    numbers: `${phoneNumber.phone}`,
  };

  axios
    .post(url, body, { headers })
    .then(async (response) => {
      console.log(response.data);
      if (response.data.return) {
        let query = `INSERT INTO otp VALUES('id', (SELECT voter_id from voters WHERE email = '${email}'),'${otp}')`;
        console.log(query);
        const result = await executeQuery(query);
        if (result) res.status(200).json({ ok: "ok" });
      }
    })
    .catch((error) => {
      res.status(200).json({ err: "UNKOWN_ERR" });
    });
});

app.post("/api/sendEmailOTP/", authenticateToken, async (req, res) => {
  const { email } = req.email;
  console.log("Getting Token", email);
  const [phoneNumber] = await executeQuery(
    `SELECT phone FROM voters WHERE email = '${email}'`
  );
  console.log(phoneNumber);
  const otp = generateFourDigitOTP();
  transporter.sendMail(
    {
      from: "verify.kisarpay@gmail.com",
      to: email,
      subject: "OTP Verification",
      html: `<p>Your OTP for E-Voting App - Docracy is <b>${otp}</b>. Kindly Do not share this OTP with anyone<p>`,
    },
    async (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).send("Error sending email");
      } else {
        let query = `INSERT INTO otp VALUES(NULL, (SELECT voter_id from voters WHERE email = '${email}'),'${otp}')`;
        console.log(query);
        const result = await executeQuery(query);
        if (result) res.status(200).json({ ok: "ok" });
        else res.status(500).send("UNKNOWN_ERR");
      }
    }
  );
});

app.post("/api/add/voters",async (req,res)=>{
  voters_data = req.body;
  voters_data.map(async (voter)=>{
    let query = `INSERT INTO voters(first_name, last_name, phone, email) VALUES('${voter.first_name}', '${voter.last_name}','${voter.phone}','${voter.email}')`;
    console.log(query);
    const result = await executeQuery(query);
    if (result) res.status(200).json({ ok: "ok" });
    else res.status(500).send("UNKNOWN_ERR");
  
  })
})

app.post("/api/add/candidates",async (req,res)=>{
  candidates_data = req.body;
  console.log(candidates_data);
  candidates_data.map(async (candidate)=>{
    let query = `INSERT INTO candidates (first_name, last_name, phone, email, post_id) VALUES('${candidate.first_name}', '${candidate.last_name}','${candidate.phone}','${candidate.email}',${candidate.post_id})`;
    console.log(query);
    const result = await executeQuery(query);
    if (result) res.status(200).json({ ok: "ok" });
    else res.status(500).send("UNKNOWN_ERR");
  
  })
})

app.get("/.well-known/acme-challenge/:fileName", async (req, res) => {
  const fsp = require("fs").promises; // Import fs with promise interface

  try {
    const filePath = __dirname + "/.well-known/acme-challenge/" + req.params.fileName;
    
    res.setHeader("content-type", "text/plain");
    
    // Use fs.readFile() method to read the file using fs.promises
    const data = await fsp.readFile(filePath, "utf8");

    // Send the file content as a response
    res.send(data);
  } catch (err) {
    // If an error occurs, handle it gracefully
    console.error("Error reading file:", err);
    res.status(500).send("Error reading file");
  }
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
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.sendStatus(401);
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, secretKey);
    console.log("decoding token", decoded.email);
    // Attach the user information to the request object for later use
    req.email = decoded;
    req.body = req.body;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
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

async function sendOTP(to, otp) {
  return client.messages
    .create({
      to: `${to}`,
      from: "+19033077423",
      body: `Ahoy! Your OTP is ${otp}`,
    })
    .then((message) => console.log(message))
    .catch((error) => {
      // You can implement your fallback code here
      console.log(error);
    });
}

function isDateInRange(date) {
  const startDate = new Date("2023-07-11T00:00:00+05:30"); // Start date: July 8th, 2023, 00:00 IST
  const endDate = new Date("2023-07-20T23:59:59+05:30"); // End date: July 10th, 2023, 23:59 IST

  // Convert the input date to India timezone
  const inputDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  return inputDate >= startDate && inputDate <= endDate;
}

function generateFourDigitOTP() {
  // Define the length of the OTP
  const otpLength = 4;

  // Generate random digits
  let otp = "";
  for (let i = 0; i < otpLength; i++) {
    otp += Math.floor(Math.random() * 10);
  }

  return otp;
}

function identifyIdentifierType(identifier) {
  // Regular expression patterns for email and phone number
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneNumberPattern = /^\d{10}$/;

  // Check if the identifier matches the email pattern
  if (emailPattern.test(identifier)) {
    return "email";
  }

  // Check if the identifier matches the phone number pattern
  if (phoneNumberPattern.test(identifier)) {
    return "phone";
  }

  // If the identifier matches neither pattern, return null
  return null;
}
