import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Loader from './Loader';
import './App.css';
import images from "./logo.png";

const App = () => {
  const [emails, setEmails] = useState('');
  const [file, setFile] = useState(null);
  const [emailCount, setEmailCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successEmails, setSuccessEmails] = useState([]);
  const [invalidEmails, setInvalidEmails] = useState([]);
  const [totalSentEmails, setTotalSentEmails] = useState(0);
  const [password, setPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    const storedTotal = localStorage.getItem('totalSentEmails');
    if (storedTotal) {
      setTotalSentEmails(parseInt(storedTotal, 10));
    }
  }, []);

  const handleEmailChange = (e) => {
    const enteredEmails = e.target.value;
    setEmails(enteredEmails);
    const emailList = enteredEmails.split(',').map(email => email.trim()).filter(email => email !== '');
    const validEmails = emailList.filter(email => emailRegex.test(email));
    setEmailCount(validEmails.length);
    setErrorMessage(validEmails.length === emailList.length ? '' : 'Some emails are invalid');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    const reader = new FileReader();

    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const extractedEmails = [...new Set(
        jsonData
          .flat()
          .filter(email => emailRegex.test(email))
      )].join(', ');

      const emailsWithComma = extractedEmails ? `${extractedEmails},` : '';
      setEmails(emailsWithComma);
      setEmailCount(emailsWithComma.split(',').filter(email => emailRegex.test(email.trim())).length);
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const validateEmails = async () => {
    try {
      const response = await axios.post('/validate-emails', { emails });
      setInvalidEmails(response.data.invalidEmails);
      if (response.data.invalidEmails.length > 0) {
        toast.error('Some emails are invalid. Please correct them before sending.');
      }
      return response.data.validEmails;
    } catch (error) {
      console.error('Error validating emails:', error);
      toast.error('Failed to validate emails');
      return [];
    }
  };

  const validatePassword = async (password) => {
    try {
      const response = await axios.post('/validate-password', { password });
      setIsPasswordValid(response.data.isValid);
    } catch (error) {
      console.error('Error validating password:', error);
      setIsPasswordValid(false);
    }
  };

  const handlePasswordChange = (e) => {
    const enteredPassword = e.target.value;
    setPassword(enteredPassword);
    validatePassword(enteredPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error('Please enter a valid password.');
      return;
    }

    const validEmails = await validateEmails();
    if (invalidEmails.length > 0) {
      return;
    }

    const formData = new FormData();
    formData.append('emails', validEmails.join(','));
    formData.append('file', file);

    setLoading(true);

    try {
      const response = await axios.post('/send-emails', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccessEmails(response.data.successEmails);
      setInvalidEmails(response.data.failedEmails);

      const totalSent = totalSentEmails + response.data.successEmails.length;
      setTotalSentEmails(totalSent);
      localStorage.setItem('totalSentEmails', totalSent);

      if (response.data.failedEmails.length > 0) {
        toast.error('Some emails failed to send. Check the Failed Emails section for details.');
      } else {
        toast.success('All emails were sent successfully.');
      }
      setEmails('');
      setFile(null);
      setPassword('');
      setEmailCount(0);
      setErrorMessage('');
      setSuccessEmails([]);
      setInvalidEmails([]);

    } catch (error) {
      console.error('There was an error sending the emails:', error);
      toast.error('Failed to process emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <ToastContainer />
      {loading && <Loader />}

      <div className='logo'>
        <img src={images} alt="Logo" />
        <h1>Bulk Email Sender</h1>
      </div>
      
      <h2>Total Emails Sent: {totalSentEmails}</h2>
      <form onSubmit={handleSubmit}>
        <div className="email-container">
          <label>Enter Emails (comma separated):</label>
          <textarea
            rows="5"
            value={emails}
            onChange={handleEmailChange}
            placeholder="example1@gmail.com, example2@gmail.com"
          />
          <span className="email-count">{emailCount} valid emails</span>
        </div>
        {errorMessage && <div className="error-message">{errorMessage}</div>}

        <div className="password-container">
          <label>Enter Password:</label>
          <input
            type="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="Enter your password"
          />
        </div>

        <div className="file-container">
          <label>Upload Excel File:</label>
          <input type="file" onChange={handleFileChange} accept=".xlsx, .xls" />
        </div>

        <button type="submit" disabled={!isPasswordValid} className={`submit-button ${!isPasswordValid ? 'disabled' : ''}`}>
          Send Emails
        </button>
      </form>

      <div className="results">
        <div className="success-emails">
          <h2>Successfully Sent Emails</h2>
          <ul className="successfully_send">
            {successEmails.length > 0 ? (
              successEmails.map((email, index) => <li key={index}>{email}</li>)
            ) : (
              <p>No emails were sent successfully.</p>
            )}
          </ul>
        </div>

        <div className="failed-emails">
          <h2>Failed to Send Emails</h2>
          <ul className="failed_send">
            {invalidEmails.length > 0 ? (
              invalidEmails.map((email, index) => (
                <li key={index}>{email}</li>
              ))
            ) : (
              <p>No emails failed to send.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;
