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


app.post('/api/register', (req, res) => {
  const email = req.body.email;
  const otp = Math.floor(100000 + Math.random() * 900000);
	console.log(req.body);
  transporter.sendMail({
    from: 'pcosart2023@gmail.com',
    to: email,
    subject: 'OTP Verification',
    text: `Your OTP for payments at THE PCOS SOCIETY portal is ${otp}`,
  }, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error sending email');
    } else {
      const sql = `INSERT INTO otpentries (email, OTP) VALUES ("${email}", "${otp}")`;
	  con.query(sql, function (err, result) {
			if (err) return res.send(err);
			else return res.status(200).send({"status":"ok"});
		});
	}
  });
});

app.get('/.well-known/acme-challenge/:fileName', (req, res) => {
	res.setHeader('content-type', 'text/plain');
	// Use fs.readFile() method to read the file
	res.send(fs.readFile(__dirname + '/.well-known/acme-challenge/' + req.params.fileName, 'utf8', function(err, data){
      
		// Display the file content
		return data;
	}));
	
});

app.post('/api/resend-otp', (req, res) => {
  const email = req.body.email;
  const otp = Math.floor(100000 + Math.random() * 900000);
	console.log(req.body);
  transporter.sendMail({
    from: 'pcosart2023@gmail.com',
    to: email,
    subject: 'OTP Verification',
    text: `Your OTP for THE PCOS SOCIETY is ${otp}`,
  }, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error sending email');
    } else {
      const sql = `INSERT INTO otpentries (email, OTP) VALUES ("${email}", "${otp}")`;
	  con.query(sql, function (err, result) {
			if (err) return res.send(err);
			else return res.status(200).send({"status":"ok"});
		});
	}
  });
});

app.post('/api/otp/verify', (req, res) => {
  const email = req.body.email;
  const userOtp = req.body.otp;
  console.log(userOtp,email);
  const sql = `SELECT OTP FROM otpentries where email="${email}"`;
	  con.query(sql, function (err, result) {
			if (err) console.log(err);
			if (userOtp === String(result[0]["OTP"])) {
				res.status(200).send({ message: 'OK' })
				
			} else {
				res.status(200).send({ message: 'BAD' })
			}
		});
});

app.delete('/api/remove/entry/:email', (req, res) => {
  const email = req.params.email;
  let sql = `DELETE FROM otpentries WHERE email='${email}'`
  console.log(sql)
  con.query(sql,(err,result)=>{
					if(err) {
						res.status(200).send("BAD");
					}
					else  res.status(200).send({ message: 'OK' });
				})
});
app.post('/api/fetch-price',(req, res) => {

const non_residential_rate_card =  {
  
  "non_residential": {
    "member": {
      "conference_type_2": {
        "date_range_1": {
          "title": "13500 + 18% GST",
          "amount_without_gst": 13500,
          "gst_amount": 2430,
          "total_amount": 15930,
          "purpose":"Opted for Conference + 2 Workshops"
        },
        "date_range_2": {
          "title": "14500 + 18% GST",
          "amount_without_gst": 14500,
          "gst_amount": 2610,
          "total_amount": 17110,
          "purpose":"Opted for Conference + 2 Workshops"
        },
        "date_range_3": {
          "title": "15500 + 18% GST",
          "amount_without_gst": 15500,
          "gst_amount": 2790,
          "total_amount": 18290,
          "purpose":"Opted for Conference + 2 Workshops"
        },
        "date_range_4": {
          "title": "17000 + 18% GST",
          "amount_without_gst": 17000,
          "gst_amount": 3060,
          "total_amount": 20060,
          "purpose":"Opted for Conference + 2 Workshops"
        }
      },
      "conference_type_1": {
        "date_range_1": {
          "title": "8500 + 18% GST",
          "amount_without_gst": 8500,
          "gst_amount": 1530,
          "total_amount": 10030,
          "purpose":"Opted for Conference only"
        },
        "date_range_2": {
          "title": "9500 + 18% GST",
          "amount_without_gst": 9500,
          "gst_amount": 1710,
          "total_amount": 11210,
          "purpose":"Opted for Conference only"
        },
        "date_range_3": {
          "title": "10500 + 18% GST",
          "amount_without_gst": 10500,
          "gst_amount": 1890,
          "total_amount": 12390,
          "purpose":"Opted for Conference only"
        },
        "date_range_4": {
          "title": "12000 + 18% GST",
          "amount_without_gst": 12000,
          "gst_amount": 2160,
          "total_amount": 14160,
          "purpose":"Opted for Conference only"
        }
      },
      "conference_type_3": {
        "date_range_1": {
          "title": "8000 + 18% GST",
          "amount_without_gst": 8000,
          "gst_amount": 1440,
          "total_amount": 9440,
          "purpose":"Post Graduate Students Conference + 2 Workshops"
        },
        "date_range_2": {
          "title": "9000 + 18% GST",
          "amount_without_gst": 9000,
          "gst_amount": 1620,
          "total_amount": 10620,
          "purpose":"Post Graduate Students Conference + 2 Workshops"
        },
        "date_range_3": {
          "title": "10000 + 18% GST",
          "amount_without_gst": 10000,
          "gst_amount": 1800,
          "total_amount": 11800,
          "purpose":"Post Graduate Students Conference + 2 Workshops"
        },
        "date_range_4": {
          "title": "11500 + 18% GST",
          "amount_without_gst": 11500,
          "gst_amount": 2070,
          "total_amount": 13570,
          "purpose":"Post Graduate Students Conference + 2 Workshops"
        }
      }
    },
    "non_member": {
      "conference_type_2": {
        "date_range_1": {
          "title": "14500 + 18% GST",
          "amount_without_gst": 14500,
          "gst_amount": 2160,
          "total_amount": 17110,
          "purpose":"Opted for Conference + 2 Workshops"
        },
        "date_range_2": {
          "title": "15500 + 18% GST",
          "amount_without_gst": 15500,
          "gst_amount": 2799,
          "total_amount": 18349,
          "purpose":"Opted for Conference + 2 Workshops"
        },
        "date_range_3": {
          "title": "16500 + 18% GST",
          "amount_without_gst": 16500,
          "gst_amount": 2979,
          "total_amount": 19529,
          "purpose":"Opted for Conference + 2 Workshops"
        },
        "date_range_4": {
          "title": "18000 + 18% GST",
          "amount_without_gst": 18000,
          "gst_amount": 3240,
          "total_amount": 21240,
          "purpose":"Opted for Conference + 2 Workshops"
        }
      },
      "conference_type_1": {
        "date_range_1": {
          "title": "9500 + 18% GST",
          "amount_without_gst": 9500,
          "gst_amount": 1710,
          "total_amount": 11210,
          "purpose":"Opted for Conference only"
        },
        "date_range_2": {
          "title": "10500 + 18% GST",
          "amount_without_gst": 10500,
          "gst_amount": 1890,
          "total_amount": 12390,
          "purpose":"Opted for Conference only"
        },
        "date_range_3": {
          "title": "11500 + 18% GST",
          "amount_without_gst": 11500,
          "gst_amount": 2070,
          "total_amount": 13570,
          "purpose":"Opted for Conference only"
        },
        "date_range_4": {
          "title": "13000 + 18% GST",
          "amount_without_gst": 13000,
          "gst_amount": 2340,
          "total_amount": 15340,
          "purpose":"Opted for Conference only"
        }
      },
      "conference_type_3": {
        "date_range_1": {
          "title": "9000 + 18% GST",
          "amount_without_gst": 9000,
          "gst_amount": 1620,
          "total_amount": 10620,
          "purpose":"Post Graduate Students Conference + 2 Workshops"
        },
        "date_range_2": {
          "title": "10000 + 18% GST",
          "amount_without_gst": 10000,
          "gst_amount": 1800,
          "total_amount": 11800,
          "purpose":"Post Graduate Students Conference + 2 Workshops"
        },
        "date_range_3": {
          "title": "11000 + 18% GST",
          "amount_without_gst": 11000,
          "gst_amount": 1980,
          "total_amount": 12980,
          "purpose":"Post Graduate Students Conference + 2 Workshops"
        },
        "date_range_4": {
          "title": "12500 + 18% GST",
          "amount_without_gst": 12500,
          "gst_amount": 2250,
          "total_amount": 14750,
          "purpose":"Post Graduate Students Conference + 2 Workshops"
        }
      }
    }
  }
}

  const residential_rate_card = {
    "residential": {
      "member": {
        "conference_type_1": {
          "date_range_1": {
            "single_room": {
              "title": "38500 + 18% GST",
              "amount_without_gst": 38500,
              "gst_amount": 6930,
              "total_amount": 45430,
              "purpose":"Opted for Conference + 2 Workshops with single room accomodation(2 nights and 3 days)"
            },
            "twin_room": {
              "title": "29500 + 18% GST",
              "amount_without_gst": 29500,
              "gst_amount": 5310,
              "total_amount": 34810,
              "purpose":"Opted for Conference + 2 Workshops with twin sharing room accomodation(2 nights and 3 days)"
            }
          },
          "date_range_2": {
            "single_room": {
              "title": "39500 + 18% GST",
              "amount_without_gst": 39500,
              "gst_amount": 7110,
              "total_amount": 46610,
              "purpose":"Opted for Conference + 2 Workshops with single room accomodation(2 nights and 3 days)"
            },
            "twin_room": {
              "title": "30500 + 18% GST",
              "amount_without_gst": 30500,
              "gst_amount": 5490,
              "total_amount": 35990,
              "purpose":"Opted for Conference + 2 Workshops with twin sharing room accomodation(2 nights and 3 days)"
            }
          }
        },
        "conference_type_2": {
          "date_range_1": {
            "single_room": {
              "title": "33500 + 18% GST",
              "amount_without_gst": 33500,
              "gst_amount": 6030,
              "total_amount": 39530,
              "purpose":"Opted for Conference only with single room accomodation(2 nights and 3 days)"
            },
            "twin_room": {
              "title": "24500 + 18% GST",
              "amount_without_gst": 24500,
              "gst_amount": 4410,
              "total_amount": 28910,
              "purpose":"Opted for Conference only with twin sharing room accomodation(2 nights and 3 days)"
            }
          },
          "date_range_2": {
            "single_room": {
              "title": "34500 + 18% GST",
              "amount_without_gst": 34500,
              "gst_amount": 6210,
              "total_amount": 40710,
              "purpose":"Opted for Conference only with single room accomodation(2 nights and 3 days)"
            },
            "twin_room": {
              "title": "25500 + 18% GST",
              "amount_without_gst": 25500,
              "gst_amount": 4590,
              "total_amount": 30090,
              "purpose":"Opted for Conference only with twin sharing room accomodation(2 nights and 3 days)"
            }
          }
        },
        "conference_type_3": {
          "date_range_1": {
            "single_room": {
              "title": "21000 + 18% GST",
              "amount_without_gst": 21000,
              "gst_amount": 3780,
              "total_amount": 24780,
              "purpose":"Opted for Conference only with single room accomodation(1 nights and 2 days)"
            },
            "twin_room": {
              "title": "16500 + 18% GST",
              "amount_without_gst": 16500,
              "gst_amount": 2970,
              "total_amount": 19470,
              "purpose":"Opted for Conference only with twin sharing room accomodation(1 nights and 2 days)"
            }
          },
          "date_range_2": {
            "single_room": {
              "title": "22000 + 18% GST",
              "amount_without_gst": 22000,
              "gst_amount": 3960,
              "total_amount": 25960,
              "purpose":"Opted for Conference only with single room accomodation(1 nights and 2 days)"
            },
            "twin_room": {
              "title": "17500 + 18% GST",
              "amount_without_gst": 17500,
              "gst_amount": 3150,
              "total_amount": 20650,
              "purpose":"Opted for Conference only with twin sharing room accomodation(1 nights and 2 days)"
            }
          }
        }
      },
      "non_member": {
        "conference_type_1": {
          "date_range_1": {
            "single_room": {
              "title": "39500 + 18% GST",
              "amount_without_gst": 39500,
              "gst_amount": 7110,
              "total_amount": 46610,
              "purpose":"Opted for Conference + 2 Workshops with single room accomodation(2 nights and 3 days)"
            },
            "twin_room": {
              "title": "30500 + 18% GST",
              "amount_without_gst": 30500,
              "gst_amount": 5490,
              "total_amount": 35990,
              "purpose":"Opted for Conference + 2 Workshops with twin sharing room accomodation(2 nights and 3 days)"
            }
          },
          "date_range_2": {
            "single_room": {
              "title": "40500 + 18% GST",
              "amount_without_gst": 40500,
              "gst_amount": 7290,
              "total_amount": 47790,
              "purpose":"Opted for Conference + 2 Workshops with single room accomodation(2 nights and 3 days)"
            },
            "twin_room": {
              "title": "31500 + 18% GST",
              "amount_without_gst": 31500,
              "gst_amount": 5670,
              "total_amount": 37170,
              "purpose":"Opted for Conference + 2 Workshops with twin sharing room accomodation(2 nights and 3 days)"
            }
          }
        },
        "conference_type_2": {
          "date_range_1": {
            "single_room": {
              "title": "39500 + 18% GST",
              "amount_without_gst": 39500,
              "gst_amount": 7110,
              "total_amount": 46610,
              "purpose":"Opted for Conference only with single room accomodation(2 nights and 3 days)"
            },
            "twin_room": {
              "title": "30500 + 18% GST",
              "amount_without_gst": 30500,
              "gst_amount": 5490,
              "total_amount": 35990,
              "purpose":"Opted for Conference only with twin sharing room accomodation(2 nights and 3 days)"
            }
          },
          "date_range_2": {
            "single_room": {
              "title": "35500+ 18% GST",
              "amount_without_gst": 35500,
              "gst_amount": 6390,
              "total_amount": 41890,
              "purpose":"Opted for Conference only with single room accomodation(2 nights and 3 days)"
            },
            "twin_room": {
              "title": "26500 + 18% GST",
              "amount_without_gst": 26500,
              "gst_amount": 4770,
              "total_amount": 31270,
              "purpose":"Opted for Conference only with twin sharing room accomodation(2 nights and 3 days)"
            }
          }
        },
        "conference_type_3": {
          "date_range_1": {
            "single_room": {
              "title": "22000 + 18% GST",
              "amount_without_gst": 22000,
              "gst_amount": 3960,
              "total_amount": 25960,
              "purpose":"Opted for Conference only with single room accomodation(1 nights and 2 days)"
            },
            "twin_room": {
              "title": "17500 + 18% GST",
              "amount_without_gst": 17500,
              "gst_amount": 3150,
              "total_amount": 20650,
              "purpose":"Opted for Conference only with twin sharing room accomodation(1 nights and 2 days)"
            }
          },
          "date_range_2": {
            "single_room": {
              "title": "23000 + 18% GST",
              "amount_without_gst": 23000,
              "gst_amount": 4140,
              "total_amount": 27140,
              "purpose":"Opted for Conference only with single room accomodation(1 nights and 2 days)"
            },
            "twin_room": {
              "title": "18500 + 18% GST",
              "amount_without_gst": 18500,
              "gst_amount": 3330,
              "total_amount": 21830,
              "purpose":"Opted for Conference only with twin sharing room accomodation(1 nights and 2 days)"
            }
          }
        }
      }
    }
  }

	const pack = req.body;
	const date = new Date(new Date().toLocaleDateString('en-US'));
	const date_point_1 = new Date("04/15/2023");
	const date_point_2 = new Date("05/15/2023");
	const date_point_3 = new Date("06/07/2023");
	
	let date_range = "";
	if(date <= date_point_1) date_range = "date_range_1"
	else if (date > date_point_1 && date <= date_point_2) date_range = "date_range_2"
	else if (date > date_point_2 && date <= date_point_3) date_range = "date_range_3"
	else if (date > date_point_3) date_range = "date_range_4"
	else date_range = ""
	console.log(pack);
  const accompanying_person_type_1 =  {
    accompanying_title : "11000 + 18% GST",
    accompanying_amount_without_gst: 11000,
    accompanying_gst_amount : 1980,
    accompanying_total_amount : 12980
  }
  const accompanying_person_type_2 =  {
    accompanying_title : "9500 + 18% GST",
    accompanying_amount_without_gst: 9500,
    accompanying_gst_amount : 1710,
    accompanying_total_amount : 11210
  }
  
  
  if(pack.package_type === "residential"){
    if(pack.accompanying_person_enabled === "needed"){
      if(pack.conference_type === "conference_type_1" || pack.conference_type === "conference_type_2"){
        const Response = {...residential_rate_card[pack.package_type][pack.member_type][pack.conference_type][date_range][pack.accomodation_type],...accompanying_person_type_1}  
        res.send(Response)

        }
        else if(pack.conference_type === "conference_type_3"){
          const Response = {...residential_rate_card[pack.package_type][pack.member_type][pack.conference_type][date_range][pack.accomodation_type],...accompanying_person_type_2}
          res.send(Response)
        }
        else res.send("BAD")
      
    }
    else if (pack.accompanying_person_enabled === "not_needed"){
      res.send(residential_rate_card[pack.package_type][pack.member_type][pack.conference_type][date_range][pack.accomodation_type])
    }
    else res.send("BAD")
  }
	else{
    res.send(non_residential_rate_card[pack.package_type][pack.member_type][pack.conference_type][date_range])
  } 
    
    
  
});


app.post('/api/createPayment', (req, res) => {
  const user_data = req.body;
  console.log(user_data);
  console.log(user_data.values.membership_number);
  console.log(JSON.stringify(user_data.workshop_titles))
  if(user_data.values.package_type == "non_residential") user_data["values"]["accomodation_type"] = "none";
  user_data.transaction_id = generateUUID();
  console.log(user_data.accompanying_total_amount);
  if(!user_data.accompanying_total_amount ) user_data.accompanying_total_amount = 0;
  const grandTotalAmount = user_data.accompanying_total_amount + user_data.amount;
  return new Promise((resolve,reject)=>{
      let sql = `INSERT INTO payments(accompanying_total_amount,grand_amount,check_in_date,check_out_date,user_salutation,user_sex,user_designation,user_institution,user_age,user_pincode,user_state,user_city,user_medical_council_number,user_membership_number,user_address,user_diet,transaction_id,user_name,user_email,user_phone,payment_purpose,amount,package_type,conference_type,member_type,accomodation_type,workshop_titles) 
                 VALUES(${user_data.accompanying_total_amount},${grandTotalAmount},"${user_data.check_in_date}","${user_data.check_out_date}","${user_data.salutation}","${user_data.sex}","${user_data.designation}","${user_data.institution}",${user_data.age},${user_data.pincode},"${user_data.state}","${user_data.city}","${user_data.medical_council_number}","${user_data.values.membership_number}","${user_data.address}","${user_data.diet}","${user_data.transaction_id}","${user_data.name}","${user_data.email}","${user_data.phone}","${user_data.purpose}",${user_data.amount},"${user_data.values.package_type}","${user_data.values.conference_type}","${user_data.values.member_type}","${user_data.values.accomodation_type}",'${JSON.stringify(user_data.workshop_titles)}') `
      console.log(sql);
      con.query(sql, function (err, result) {
        if(err) reject(err);
        resolve("OK");
        });
  })
  .then((message)=>{
    const InstaMojo = require('instamojo-nodejs');
   InstaMojo.setKeys("61b4b8655b0122a778eda9dd0c0e2886", "f3bd3d30ba048a48c060fe1c84695f68");
//	InstaMojo.setKeys("test_88d180ddbcf19919947882b72c3","test_bce6db503e84e3eee6ce344f8d7")
  //  InstaMojo.isSandboxMode(true);
    const data = new InstaMojo.PaymentData();

    data.purpose = req.body.purpose;            
    data.amount = grandTotalAmount;                  
//    data.amount = 10;
	
    data.setRedirectUrl(`https://kisargo.ml/success/${user_data.transaction_id}`);
    data.email = req.body.email;
    data.buyer_name = req.body.name;
    data.phone = req.body.phone;
    data.user_id = generateUUID();
    data.webhook_url = "/webhook";
  
  
  
    InstaMojo.createPayment(data, function(error, response) {
      if (error) {
      res.send("BAD")
      } else {
      res.send(response);
      console.log(response);
      }
   });
  
    })
   .catch((err)=>{console.log(err)})
  
  
  
    
});

app.post('/api/createOfflinePayment', (req, res) => {
  const user_data = req.body;
  console.log(user_data);
  console.log(JSON.stringify(user_data.workshop_titles))
  if(user_data.values.package_type == "non_residential") user_data["values"]["accomodation_type"] = "none";
  user_data.transaction_id = generateUUID();
  if(!user_data.accompanying_total_amount ) user_data.accompanying_total_amount = 0;
  const grandTotalAmount = user_data.accompanying_total_amount + user_data.amount;
  const date = new Date();
  return new Promise((resolve,reject)=>{
      let sql = `INSERT INTO payments(accompanying_total_amount,grand_amount,check_in_date,check_out_date,user_salutation,user_sex,user_designation,user_institution,user_age,user_pincode,user_state,user_city,user_medical_council_number,user_membership_number,user_address,user_diet,transaction_id,user_name,user_email,user_phone,payment_purpose,amount,package_type,conference_type,member_type,accomodation_type,workshop_titles,payment_method,date_of_transaction,time_of_transaction) 
                 VALUES(${user_data.accompanying_total_amount},${grandTotalAmount},"${user_data.check_in_date}","${user_data.check_out_date}","${user_data.salutation}","${user_data.sex}","${user_data.designation}","${user_data.institution}",${user_data.age},${user_data.pincode},"${user_data.state}","${user_data.city}","${user_data.medical_council_number}","${user_data.values.membership_number}","${user_data.address}","${user_data.diet}","${user_data.transaction_id}","${user_data.name}","${user_data.email}","${user_data.phone}","${user_data.purpose}",${user_data.amount},"${user_data.values.package_type}","${user_data.values.conference_type}","${user_data.values.member_type}","${user_data.values.accomodation_type}",'${JSON.stringify(user_data.workshop_titles)}','RTGS/NEFT/Cheque/DD','${getFormattedDate(date)}','${getFormattedTime(date)}') `
      con.query(sql, function (err, result) {
        if(err) reject(err);
        resolve("OK");
        });
  })
  .then((message)=>{
      console.log(message);
    })
   .catch((err)=>{console.log(err)})
  
  
  
    
});

app.post('/api/entry', (req, res) => {
  const user_data = req.body;
  console.log(user_data);
  console.log(JSON.stringify(user_data.workshop_titles))
  //if(user_data.values.package_type == "non_residential") user_data["values"]["accomodation_type"] = "none";
  user_data.transaction_id = generateUUID();
  if(!user_data.accompanying_total_amount ) user_data.accompanying_total_amount = 0;
  const grandTotalAmount = user_data.accompanying_total_amount + user_data.amount;
  const date = new Date();
  return new Promise((resolve,reject)=>{
      let sql = `INSERT INTO payments(accompanying_total_amount,grand_amount,check_in_date,check_out_date,paymentStatus,user_salutation,user_sex,user_designation,user_institution,user_age,user_pincode,user_state,user_city,user_medical_council_number,user_membership_number,user_address,user_diet,transaction_id,user_name,user_email,user_phone,payment_purpose,amount,package_type,conference_type,member_type,accomodation_type,workshop_titles,payment_method,date_of_transaction,time_of_transaction) 
                 VALUES(${user_data.accompanying_total_amount},${grandTotalAmount},"${user_data.check_in_date}","${user_data.check_out_date}","${user_data.paymentStatus}","${user_data.user_salutation}","${user_data.user_sex}","${user_data.user_designation}","${user_data.user_institution}","${user_data.user_age}","${user_data.user_pincode}","${user_data.user_state}","${user_data.user_city}","${user_data.user_medical_council_number}","${user_data.membership_number}","${user_data.user_address}","${user_data.user_diet}","${user_data.transaction_id}","${user_data.user_name}","${user_data.user_email}","${user_data.user_phone}","${user_data.payment_purpose}",${user_data.amount},"${user_data.package_type}","${user_data.conference_type}","${user_data.member_type}","${user_data.accomodation_type}",'${JSON.stringify(user_data.workshop_titles)}',"${user_data.payment_method}",'${getFormattedDate(date)}','${getFormattedTime(date)}') `
      con.query(sql, function (err, result) {
        if(err) reject(err);
        resolve(result);
        });
  })
  .then((message)=>{
     console.log(message);  
     res.send(message);
    })
   .catch((err)=>{
                    console.log(err);
                    res.send(err)
                  })
  
  
  
    
});




app.get('/success/:transacton_id', (req, res) => {
  const InstaMojo = require('instamojo-nodejs');
  InstaMojo.setKeys("61b4b8655b0122a778eda9dd0c0e2886", "f3bd3d30ba048a48c060fe1c84695f68");
//	InstaMojo.setKeys("test_88d180ddbcf19919947882b72c3","test_bce6db503e84e3eee6ce344f8d7")
 // InstaMojo.isSandboxMode(true);

  InstaMojo.getPaymentDetails(req.query.payment_request_id, req.query.payment_id, function(error, response) {
    if (error) {
      console.log("BAD")
    } else {
      console.log("Gateway response")
      console.log(response)
      const paymentData = response.payment_request.payment
      const paymentStatus = (paymentData.status !== "Failed") ? "success"  : "failed"
      //console.log(paymentData)
      const date = new Date(paymentData.created_at)
      const paymentDate = getFormattedDate(date);
      const paymentTime = getFormattedTime(date);
      return new Promise((resolve,reject)=>{
        let sql = `UPDATE payments SET date_of_transaction='${paymentDate}', 
                                       time_of_transaction='${paymentTime}',
                                      paymentStatus='${paymentStatus}',
                                      paymentID='${req.query.payment_id}' 
                                      WHERE transaction_id = '${req.params.transacton_id}'
                                      `;
        con.query(sql,(err,result)=>{
            if(err) {
              res.send("BAD");
              reject("BAD")
            }
            else resolve(req.params.transacton_id)
        })
        console.log(sql);
      })
      .then((transaction_id)=>{
        console.log("Database updated")
        res.redirect(`https://pcos-pay.vercel.app/paymentStatus/${transaction_id}`)
      })
      .catch((message)=>console.log(message)) 
    }
  });
});



app.get('/api/checkPaymentStatus/:transaction_id', (req, res) => {
    return new Promise((resolve,reject)=>{
    const transaction_id = req.params.transaction_id;
    let sql = `SELECT paymentStatus from payments WHERE transaction_id="${transaction_id}"`;
    
    con.query(sql,(err,result)=>{
      if(err) reject(err);
      resolve(result);
    })

    })
    .then((result)=>{
      res.send(result[0])
    })
    .catch((err)=>res.send("BAD"));

});

app.post("/api/updateTransactionData",(req,res)=>{
  if(!req.body.accompanying_total_amount ) req.body.accompanying_total_amount = 0;
  const grandTotalAmount = req.body.accompanying_total_amount + req.body.amount;
  if(req.body.accompanying_person_enabled === "not_needed") grandTotalAmount = 0;
  
  return new Promise((resolve,reject)=>{
    const sql = `
  UPDATE payments
  SET 
    accompanying_total_amount = '${req.body.accompanying_total_amount}',
    grand_amount = '${grandTotalAmount}',
    accomodation_type = '${req.body.accomodation_type}',
    amount = '${req.body.amount}',
    conference_type = '${req.body.conference_type}',
    member_type = '${req.body.member_type}',
    package_type = '${req.body.package_type}',
    paymentID = '${req.body.paymentID}',
    paymentStatus = '${req.body.paymentStatus}',
    payment_purpose = '${req.body.payment_purpose}',
    transaction_id = '${req.body.transaction_id}',
    user_address = '${req.body.user_address}',
    user_age = '${req.body.user_age}',
    user_city = '${req.body.user_city}',
    user_designation = '${req.body.user_designation}',
    user_diet = '${req.body.user_diet}',
    user_email = '${req.body.user_email}',
    user_institution = '${req.body.user_institution}',
    user_medical_council_number = '${req.body.user_medical_council_number}',
    user_membership_number = '${req.body.user_membership_number}',
    user_name = '${req.body.user_name}',
    user_phone = '${req.body.user_phone}',
    user_pincode = '${req.body.user_pincode}',
    user_salutation = '${req.body.user_salutation}',
    user_sex = '${req.body.user_sex}',
    user_state = '${req.body.user_state}',
    workshop_titles = '${req.body.workshop_titles}'
  WHERE transaction_id = '${req.body.transaction_id}';
`;

    
    con.query(sql,(err,result)=>{
      console.log(sql);
      if(err) reject(err);
      resolve(result);
    })

    })
    .then((result)=>{
      	console.log(result)
	res.status(200).send(result)
    })
    .catch((err)=>{
	    console.log(err)
	    res.status(500).send(err)
    });


})

app.post('/detect-country', (req, res) => {
  const phoneNumber = req.body.phone;
  const countryCode = getCountryCodeFromPhoneNumber(phoneNumber);
  res.send(`{"country_code":"${countryCode}"}`);
});



app.get('/send-invoice/:transaction_id', async (req, res, next) => {
  try {
  const  transaction_id = req.params.transaction_id;
  const sql = `SELECT * FROM payments WHERE transaction_id="${transaction_id}"`;
  return new Promise((resolve,reject)=>{
    con.query(sql,(err,result)=>{
      if(err) reject(err)
      resolve(result)
    })
  })
  .then((result)=>{
    const details = result[0];
    if(true){
      ejs.renderFile((path.join(__dirname),"register-form.ejs"),
        {
          date:getFormattedDate(details.date_of_transaction),
          name:details.user_name
        }
      )
      .then((formHtml)=>{
        
          const mailOptions = {
            from: 'pcosart2023@gmail.com',
            to: 'mohammedfaisal3366@gmail.com',
            subject: 'Registration form',
            html: formHtml,

          };

          transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
              console.error(err);
            } else {
              console.log(info);
              console.log('Email sent successfully');
            }
          });
        
      })
      .catch((err)=>console.log(err))
    }
    console.log(details.user_name.split(' ')[0]);
    ejs.renderFile((path.join(__dirname),"confirm.ejs"),
                    {
                      nameWSal : `${details.user_salutation}.${details.user_name.split(' ')[0]}`,
                      unique_id: zeroPad(details.unique_id,4),
                      package_type:details.package_type,
                      accomodation_type: details.accomodation_type,
                      member_type:details.member_type,
                      conference_type:details.conference_type,
                      check_in_date: details.check_in_date,
                      check_out_date:details.check_out_date,
                      payment_method:details.payment_method

                    })
                    .then((html)=>{
                      const usermailOptions = {
                        from: 'pcosart2023@gmail.com',
                        to: 'verify.kisarpay@gmail.com',
                        subject: 'Registration confirmed',
                        html: html
                      }
                      const adminmailOptions = {
                        from: 'pcosart2023@gmail.com',
                        to: 'verify.kisarpay@gmail.com',
                        subject: 'Registration received',
                        html: html
                      }

                      transporter.sendMail(usermailOptions, function(error, info) {
                        if (error) {
                          console.log(error);
                          res.status(500).send('Error sending email');
                        } else {
                          console.log('Email sent: ' + info.response);
                          res.status(200).send('Email sent successfully');
                        }
                      })
                      transporter.sendMail(adminmailOptions, function(error, info) {
                        if (error) {
                          console.log(error);
                          res.status(500).send('Error sending email');
                        } else {
                          console.log('Email sent: ' + info.response);
                          res.status(200).send('Email sent successfully');
                        }
                      })

                    })
                    .catch((err)=>console.log(err))
                      
  
                        
                      }
  
  )
  .catch((err)=>console.log(err))
  // const html = ejs.renderFile(path.join(__dirname),"confirm.ejs",
  //               {
  //                 unique_id: 
  //               }
  // )
    
  } 
  catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


app.get("/api/getAllUsers",(req,res)=>{
  return new Promise((resolve,reject)=>{
    let sql = `SELECT * from payments `;
    
    con.query(sql,(err,result)=>{
      if(err) reject(err);
      resolve(result);
    })

    })
    .then((result)=>{
      res.send(result)
    })
    .catch((err)=>res.send("BAD"));


})


app.get('/receipt/:transaction_id', async (req, res) => {
  
  const  transaction_id = req.params.transaction_id;
  readFileAsync('invoice.html', 'utf8')
  .then( async (invoiceHtml)=>{
    return new Promise((resolve,reject)=>{
           let sql = `SELECT * FROM payments WHERE transaction_id='${transaction_id}'`;
           console.log(sql)
    
           con.query(sql,(err,result)=>{
             if(err) reject("BAD")
             console.log(result)
             resolve(result[0])
    
           })
         }).then((response)=>{
            console.log(response);	
	          const gst = (response.amount * 0.18).toFixed(3);
            const total = ((response.amount).toFixed(2));
            console.log(formatINR(gst));
            const unique_id_string = zeroPad(response.unique_id,4)
           
            ejs.renderFile(path.join(__dirname, 'invoice.ejs'), { 
              transaction_id: transaction_id,
              name:response.user_name,
              description: response.package_type == "residential" ? "Residential Package: " : "Non Residential Package: " + response.payment_purpose,
              date:getFormattedDate(response.date_of_transaction),
              time:response.time_of_transaction,
              gst:formatINR(gst),
              total:formatINR(total),
              amount:formatINR(total-gst),
              unique_id: unique_id_string

            })
           .then(renderedHtml => {
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment; filename=receipt.pdf');
              wkhtmltopdf(renderedHtml, { pageSize: 'A4' }).pipe(res);
            }).catch(err => {
              res.status(500).send('Error rendering EJS');
            });
    
         })
  
  
});
})

app.get("/demo",(req,res)=>{
  res.render('/var/www/html/server/invoice-net.ejs',{name:"Alex",amount:"213",description:"hdsbfhddsfkjwfnjrnfjr",address:"jfdhewbfhe"})
})

app.get("/send-pdf",async (req,res)=>{
  

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
