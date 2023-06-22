const express = require('express');
const nodemailer = require('nodemailer');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require("mysql2");
const PhoneNumber = require('libphonenumber-js');
const { v4: uuidv4 } = require('uuid');
const PORT = 80;
const http = require('http');
const https = require('https');
const moment = require('moment-timezone');
const pdf = require('html-pdf');

const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const  html_to_pdf = require('html-pdf-node');
const PDFDocument = require('pdfkit');
const wkhtmltopdf = require('wkhtmltopdf');
const ejs = require('ejs');
const path = require('path');
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
  database: "pcos"
});

con.connect((err)=> {
		if(err) console.log(err)
		else console.log("Connected")
})
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.use(cors());
app.use(express.static('public'));
app.use(express.static(__dirname, { dotfiles: 'allow' } ));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'pcosart2023@gmail.com',
    pass: 'xqedrvweetrbizry',
  },
  pool: true,
});


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

httpServer.listen(80, () => {
	console.log('HTTP Server running on port 80');
});

httpsServer.listen(443, () => {
	console.log('HTTPS Server running on port 443');
});



//app.listen(PORT, () => {
//  console.log('Server started on port 3500');
//});

function getOtpForEmail(email) {
  const sql = `SELECT OTP FROM OTPEntries where email="${email}"`;
	  con.query(sql, function (err, result) {
			if (err) console.log(err);
			return result[0]["OTP"];
		});
  
}

function getCountryCodeFromPhoneNumber(phoneNumber) {
  const parsedNumber = PhoneNumber.parse(phoneNumber);
  return parsedNumber.country;
}


function generateUUID() {
  return uuidv4();
}

function getFormattedDate (date){
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;
  return formattedDate;
}


function getFormattedTime (date){
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const formattedTime = `${hours}:${minutes}:${seconds}`;
  return formattedTime
}

function formatINR(number) {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  });
  return formatter.format(number);

}

function convertToIST(dateString) {
  const date = moment.utc(dateString).tz('Asia/Kolkata');
  return date.format('YYYY-MM-DDTHH:mm:ss.SSSZ');
}

function generatePdfBuffer(templatePath, transaction_id) {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      const ejsTemplate = fs.readFileSync(templatePath, 'utf-8');
      const htmlContent = ejs.render(ejsTemplate, { transaction_id: transaction_id});

      await page.setContent(htmlContent);
      await page.emulateMediaType('print');

      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

      await browser.close();

      resolve(pdfBuffer);
    } catch (error) {
      reject(error);
    }
  });
}

function zeroPad(num, length) {
  return num.toString().padStart(length, '0');
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}