import React, { useState } from "react";
import Layout from "./../../components/Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/AuthStyles.css";
import {
  containsXSS,
  containsSQLInjection,
  isValidPhone,
  isValidLength,
  isNotWhitespaceOnly,
} from "../../helpers/validationHelper";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [DOB, setDOB] = useState("");
  const [answer, setAnswer] = useState("");
  const navigate = useNavigate();

  const validateForm = () => {
    if (!isNotWhitespaceOnly(name)) {
      toast.error("Name cannot be whitespace only");
      return false;
    }

    if (!isNotWhitespaceOnly(password)) {
      toast.error("Password cannot be whitespace only");
      return false;
    }

    if (!isNotWhitespaceOnly(phone)) {
      toast.error("Phone number cannot be whitespace only");
      return false;
    }

    if (!isNotWhitespaceOnly(address)) {
      toast.error("Address cannot be whitespace only");
      return false;
    }

    if (!isNotWhitespaceOnly(answer)) {
      toast.error("Answer cannot be whitespace only");
      return false;
    }

    const phoneValidation = isValidPhone(phone);
    if (!phoneValidation.valid) {
      toast.error(phoneValidation.error);
      return false;
    }

    if (!isValidLength(name, 100)) {
      toast.error("Name is too long (max 100 characters)");
      return false;
    }

    if (!isValidLength(address, 500)) {
      toast.error("Address is too long (max 500 characters)");
      return false;
    }

    // Check for XSS attempts
    if (
      containsXSS(name) ||
      containsXSS(password) ||
      containsXSS(address) ||
      containsXSS(answer)
    ) {
      toast.error("Invalid characters detected");
      return false;
    }

    // Check for SQL injection attempts
    if (
      containsSQLInjection(name) ||
      containsSQLInjection(email) ||
      containsSQLInjection(password) ||
      containsSQLInjection(address) ||
      containsSQLInjection(answer)
    ) {
      toast.error("Invalid characters detected");
      return false;
    }

    return true;
  };

  // form function
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const res = await axios.post("/api/v1/auth/register", {
        name,
        email,
        password,
        phone,
        address,
        DOB,
        answer,
      });
      if (res && res.data.success) {
        toast.success("Register Successfully, please login");
        navigate("/login");
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    }
  };

  return (
    <Layout title="Register - Ecommerce App">
      <div className="form-container" style={{ minHeight: "90vh" }}>
        <form onSubmit={handleSubmit}>
          <h4 className="title">REGISTER FORM</h4>
          <div className="mb-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control"
              id="exampleInputName1"
              placeholder="Enter Your Name"
              required
              autoFocus
            />
          </div>
          <div className="mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              id="exampleInputEmail1"
              placeholder="Enter Your Email"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              id="exampleInputPassword1"
              placeholder="Enter Your Password"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-control"
              id="exampleInputPhone1"
              placeholder="Enter Your Phone"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="form-control"
              id="exampleInputaddress1"
              placeholder="Enter Your Address"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="date"
              value={DOB}
              onChange={(e) => setDOB(e.target.value)}
              className="form-control"
              id="exampleInputDOB1"
              placeholder="Enter Your DOB"
              required
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="form-control"
              id="exampleInputanswer1"
              placeholder="What is Your Favorite sports"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            REGISTER
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Register;
