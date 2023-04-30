const express = require('express');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } = require('@mui/material');
const nodemailer = require('nodemailer');

const router = express.Router();

// Define the React component that renders the table
function TableComponent() {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Age</TableCell>
            <TableCell>City</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>John</TableCell>
            <TableCell>30</TableCell>
            <TableCell>New York</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Jane</TableCell>
            <TableCell>25</TableCell>
            <TableCell>Los Angeles</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Bob</TableCell>
            <TableCell>45</TableCell>
            <TableCell>Chicago</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// Define the server-side rendering function
function renderToHtml(component) {
  return ReactDOMServer.renderToString(component);
}

// Define the email sending function
function sendEmail() {
  // Set up the email sending configuration
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'pcosart2023@gmail.com',
        pass: 'xqedrvweetrbizry',
    },
    pool: true,
  });

  // Define the email options
  const mailOptions = {
    from: 'pcosart2023@gmail.com',
    to: 'mohammedfaisal3366@gmail.com',
    subject: 'Registration payment received',
    html: renderToHtml(<TableComponent />)
  };

  // Send the email
  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.error(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

// Define the API route
router.get('/sendformmail', (req, res) => {
  sendEmail();
  res.send('Email sent');
});

module.exports = router;
