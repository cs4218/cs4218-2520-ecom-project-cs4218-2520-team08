import React, { useState } from "react";
import Layout from "./../../components/Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  containsXSS,
  containsSQLInjection,
  isNotWhitespaceOnly,
} from "../../helpers/validationHelper";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();

  const validateForm = () => {
    if (!isNotWhitespaceOnly(answer)) {
      toast.error("Answer cannot be whitespace only");
      return false;
    }
    if (!isNotWhitespaceOnly(newPassword)) {
      toast.error("Password cannot be whitespace only");
      return false;
    }
    if (containsXSS(answer) || containsXSS(newPassword)) {
      toast.error("Invalid characters detected");
      return false;
    }
    if (
      containsSQLInjection(email) ||
      containsSQLInjection(answer) ||
      containsSQLInjection(newPassword)
    ) {
      toast.error("Invalid characters detected");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      const res = await axios.post("/api/v1/auth/forgot-password", {
        email,
        answer,
        newPassword,
      });
      if (res && res.data.success) {
        toast.success(res.data.message);
        navigate("/login");
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      const message =
        error.response?.data?.message || "Something went wrong";
      toast.error(message);
    }
  };

  return (
    <Layout title="Forgot Password - Ecommerce App">
      <div className="form-container " style={{ minHeight: "90vh" }}>
        <form onSubmit={handleSubmit}>
          <h4 className="title">FORGOT PASSWORD FORM</h4>

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
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="form-control"
              id="exampleInputanswer1"
              placeholder="Enter Your Answer"
              required
            />
          </div>

          <div className="mb-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-control"
              id="exampleInputnewPassword1"
              placeholder="Enter Your New Password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-100">
            FORGOT PASSWORD
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default ForgotPassword;
