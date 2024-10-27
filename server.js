require("dotenv").config();
const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");
const deepEmailValidator = require("deep-email-validator");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const port = process.env.PORT || 5000;

if (
  !process.env.MONGODB_URI ||
  !process.env.EMAIL_USER ||
  !process.env.EMAIL_PASS
) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const emailStatsSchema = new mongoose.Schema({
  successCount: { type: Number, default: 0 },
});

const EmailStats = mongoose.model("EmailStats", emailStatsSchema);

const passwordSchema = new mongoose.Schema({
  hashedPassword: { type: String, required: true },
});

const Password = mongoose.model("Password", passwordSchema);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function isEmailValid(email) {
  return deepEmailValidator.validate(email);
}

app.post("/set-password", async (req, res) => {
  const { password } = req.body;
  try {
    const existingPasswordEntry = await Password.findOne({});
    if (existingPasswordEntry) {
      return res.status(400).send("Password already set.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const passwordEntry = new Password({ hashedPassword });

    await passwordEntry.save();
    res.status(201).send("Password set successfully");
  } catch (error) {
    console.error("Error setting password:", error);
    res.status(500).send("Error setting password");
  }
});

app.post("/validate-password", async (req, res) => {
  const { password } = req.body;

  try {
    const passwordEntry = await Password.findOne({});
    if (passwordEntry) {
      const isMatch = await bcrypt.compare(
        password,
        passwordEntry.hashedPassword
      );
      return res.json({ isValid: isMatch });
    } else {
      return res.json({ isValid: false });
    }
  } catch (error) {
    console.error("Error validating password:", error);
    res.status(500).send("Error validating password");
  }
});

app.post("/validate-emails", async (req, res) => {
  const { emails } = req.body;
  const emailList = emails.split(",").map((email) => email.trim());

  let invalidEmails = [];
  let validEmails = [];

  const validationPromises = emailList.map(async (email) => {
    const validation = await isEmailValid(email);
    if (validation.valid) {
      validEmails.push(email);
    } else {
      invalidEmails.push(email);
    }
  });

  await Promise.all(validationPromises);

  res.json({ validEmails, invalidEmails });
});

app.post("/send-emails", upload.single("file"), async (req, res) => {
  const { emails } = req.body;
  const emailList = emails.split(",").map((email) => email.trim());

  let fileEmails = [];
  if (req.file) {
    const workbook = xlsx.read(req.file.buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);
    fileEmails = data.map((row) => row.Email);
  }

  const allEmails = [...emailList, ...fileEmails];
  let successEmails = [];
  let failedEmails = [];

  const promises = allEmails.map(async (email) => {
    const validation = await isEmailValid(email);
    if (!validation.valid) {
      failedEmails.push(email);
      return;
    }

    return new Promise((resolve) => {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject:
          "Unlock Your Online Potential with Professional Web Development",
        html: `
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f4;
                    }
                    .container {
                        width: 100%;
                        max-width: 600px;
                        margin: auto;
                        background: #ffffff;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                    }
                    h2 {
                        color: #ff5e14;
                    }
                    p {
                        line-height: 1.5;
                    }
                    .services, .offers, .comparison {
                        margin: 20px 0;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                    }
                    .service-item, .offer-item {
                        margin: 10px 0;
                        padding: 5px;
                    }
                    .comparison-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                    }
                    .comparison-table th, .comparison-table td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: center;
                    }
                    .footer {
                        margin-top: 20px;
                        text-align: center;
                    }
                    img {
                        max-width: 100%;
                        border-radius: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Hello!</h2>
                    <p>I hope this message finds you well. My name is Girija Shankar Mohanta, and I am a web developer with over 2 years of experience in creating stunning and functional websites.</p>
                    
                    <h3>Services I Offer:</h3>
                    <div class="services">
                        <h4>Frontend Development:</h4>
                        <div class="service-item">✔️ Static and Dynamic Websites</div>
                        <div class="service-item">✔️ Modern Frameworks: React, Angular, Next.js</div>
                        <div class="service-item">✔️ HTML, CSS, JavaScript, jQuery, and Bootstrap</div>
                        <div class="service-item">✔️ Redeveloping and enhancing existing websites</div>
                        
                        <h4>Backend Development:</h4>
                        <div class="service-item">✔️ Node.js and Express.js for scalable server applications</div>
                        <div class="service-item">✔️ MongoDB for database management</div>
                        <div class="service-item">✔️ Firebase for real-time database and hosting</div>
                        <div class="service-item">✔️ Cloudinary for media storage and optimization</div>
                    </div>
                    
                    <h3>Why Choose Me?</h3>
                    <p>I offer lifetime support for changes and minimal charges for adding new functionalities based on your requirements. My goal is to help you achieve your online objectives!</p>
                    
                    <h3>Service Comparison:</h3>
                    <div class="comparison">
                        <table class="comparison-table">
                            <tr>
                                <th>Features</th>
                                <th>My Agency</th>
                                <th>Other Agencies</th>
                            </tr>
                            <tr>
                                <td>Lifetime Service</td>
                                <td>✔️ Yes</td>
                                <td>❌ No</td>
                            </tr>
                            <tr>
                                <td>Minimal Change Fees</td>
                                <td>✔️ Yes</td>
                                <td>❌ High Charges</td>
                            </tr>
                            <tr>
                                <td>Free Website Maintenance</td>
                                <td>✔️ Yes</td>
                                <td>❌ Extra Cost</td>
                            </tr>
                            <tr>
                                <td>Anytime Support</td>
                                <td>✔️ Yes</td>
                                <td>❌ Limited Hours</td>
                            </tr>
                        </table>
                    </div>
    
                    <h3>Special Offers:</h3>
                    <div class="offers">
                        <div class="offer-item">🔥 10% off for first-time clients!</div>
                        <div class="offer-item">🔥 Free consultation for your project ideas!</div>
                    </div>
    
                    <h3>Contact Me:</h3>
                    <p>If you’re interested in discussing this further, feel free to reach out:</p>
                    <ul>
                        <li>Email: <a href="mailto:girijashankarmohanta11@gmail.com">girijashankarmohanta11@gmail.com</a></li>
                        <li>Phone: 6370296592</li>
                    </ul>
    
                    <div class="footer">
                        <p>Looking forward to the opportunity to work together!</p>
                        <p>Best regards,<br>Girija Shankar Mohanta</p>
                        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ4F4TdtMHnjJ5p8gsDHPoFrIIXUsseI_HO9w&s" alt="Professional Image">
                    </div>
                </div>
            </body>
            </html>
        `,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          // console.log(`Error sending email to ${email}:`, error);
          failedEmails.push(email);
        } else {
          // console.log(`Email sent to ${email}:`, info.response);
          successEmails.push(email);
        }
        resolve();
      });
    });
  });

  await Promise.all(promises);
  if (successEmails.length > 0) {
    await EmailStats.findOneAndUpdate(
      {},
      { $inc: { successCount: successEmails.length } },
      { upsert: true }
    );
  }

  res.json({ successEmails, failedEmails });
});

app.get("/email-stats", async (req, res) => {
  const stats = await EmailStats.findOne({});
  res.json(stats || { successCount: 0 });
});

app.get("/ping", (req, res) => {
  res.send("API is live and running!");
});

app.use(express.static(path.join(__dirname, "frontend", "build")));

// Handle requests for routes not handled by the API
app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "frontend", "build", "index.html"),
    (err) => {
      if (err) {
        res.status(500).send(err);
      }
    }
  );
});

app.listen(port, () => {
  console.log("server is running on port" + " " + port);
});
