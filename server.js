const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require("mysql2");
const PORT = 80;
const http = require('http');
const https = require('https');

const fs = require('fs');
// Certificate
const privateKey = fs.readFileSync('/etc/letsencrypt/live/kisargo.ml/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/kisargo.ml/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/kisargo.ml/fullchain.pem', 'utf8');
const PdfPrinter = require('pdfmake/src/printer');
const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};


const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "65109105@mysql",
  database: "docracy"
});

con.connect((err)=> {
		if(err) console.log(err)
		else console.log("Connected to database")
})
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.use(cors());


app.get("/api/randomNumber",(req,res)=>{
    res.json({number:getRandomInt(20, 100)})
})
app.get('/.well-known/acme-challenge/:fileName', (req, res) => {
	res.setHeader('content-type', 'text/plain');
	// Use fs.readFile() method to read the file
	res.send(fs.readFile(__dirname + '/.well-known/acme-challenge/' + req.params.fileName, 'utf8', function(err, data){
      
		// Display the file content
		return data;
	}));
	
});
// Starting both http & https servers
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(PORT, () => {
	console.log('HTTP Server running on port 80');
});

httpsServer.listen(443, () => {
	console.log('HTTPS Server running on port 443');
});



