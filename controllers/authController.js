import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";

import { comparePassword, hashPassword } from "./../helpers/authHelper.js";
import JWT from "jsonwebtoken";

// Validation helper functions
const containsXSS = (value) => {
  const xssPatterns = [
    /<script\b/gi,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<[^>]+on\w+\s*=/gi,
    /<img[^>]+onerror/gi,
    /<[^>]+src\s*=\s*["']?javascript:/gi,
    /javascript:/gi,
  ];
  return xssPatterns.some((pattern) => pattern.test(value));
};

const containsSQLInjection = (value) => {
  const sqlPatterns = [
    /('\s*;?\s*DROP\s+TABLE)/gi,
    /('\s*;?\s*DELETE\s+FROM)/gi,
    /('\s*;?\s*INSERT\s+INTO)/gi,
    /('\s*;?\s*UPDATE\s+\w+\s+SET)/gi,
    /('\s*OR\s+'?\d+'?\s*=\s*'?\d+'?)/gi,
    /'OR\s*'?\d+'?\s*'?\s*=\s*'?\d+/gi,
    /\bOR\s*\d+\s*=\s*\d+\b/gi,
    /(--\s*$)/gm,
  ];
  return sqlPatterns.some((pattern) => pattern.test(value));
};

const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Please enter a valid email address" };
  }
  if (email.length > 254) {
    return { valid: false, error: "Email is too long" };
  }
  return { valid: true };
};

const isValidPhone = (phone) => {
  if (!phone || typeof phone !== "string") return false;
  const digitsOnlyRegex = /^\d+$/;
  if (!digitsOnlyRegex.test(phone)) {
    return { valid: false, error: "Phone number must contain only digits" };
  }
  if (phone.length < 7 || phone.length > 15) {
    return { valid: false, error: "Phone number must be 7-15 digits" };
  }
  return { valid: true };
};

const isValidLength = (value, maxLength) => {
  return value.length <= maxLength;
};

const isNotWhitespaceOnly = (value) => {
  return value.trim().length > 0;
};

const isValidDOB = (dob) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dob.trim())) {
    return {
      valid: false,
      error: "Please enter a valid date of birth (YYYY-MM-DD)",
    };
  }
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) {
    return { valid: false, error: "Please enter a valid date of birth" };
  }
  const [y, m, d] = dob.split("-").map(Number);
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return { valid: false, error: "Please enter a valid date of birth" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dobDate = new Date(y, m - 1, d);
  dobDate.setHours(0, 0, 0, 0);
  if (dobDate > today) {
    return { valid: false, error: "Date of birth cannot be in the future" };
  }
  return { valid: true };
};

export const registerController = async (req, res) => {
  try {
    const { name, email, password, phone, address, DOB, answer } = req.body;
    //validations
    if (!name) {
      return res.status(404).send({ error: "Name is Required" });
    }
    if (!email) {
      return res.status(404).send({ message: "Email is Required" });
    }
    if (!password) {
      return res.status(404).send({ message: "Password is Required" });
    }
    if (!phone) {
      return res.status(404).send({ message: "Phone no is Required" });
    }
    if (!address) {
      return res.status(404).send({ message: "Address is Required" });
    }
    if (!DOB) {
      return res.status(404).send({ message: "DOB is Required" });
    }
    if (!answer) {
      return res.status(404).send({ message: "Answer is Required" });
    }

    const emailLower = email.trim().toLowerCase();

    if (!isNotWhitespaceOnly(name)) {
      return res
        .status(400)
        .send({ message: "Name cannot be whitespace only" });
    }
    if (!isNotWhitespaceOnly(email)) {
      return res
        .status(400)
        .send({ message: "Email cannot be whitespace only" });
    }

    if (!isNotWhitespaceOnly(password)) {
      return res
        .status(400)
        .send({ message: "Password cannot be whitespace only" });
    }
    if (!isNotWhitespaceOnly(phone)) {
      return res
        .status(400)
        .send({ message: "Phone no cannot be whitespace only" });
    }
    if (!isNotWhitespaceOnly(address)) {
      return res
        .status(400)
        .send({ message: "Address cannot be whitespace only" });
    }
    if (!isNotWhitespaceOnly(DOB)) {
      return res.status(400).send({ message: "DOB cannot be whitespace only" });
    }
    if (!isNotWhitespaceOnly(answer)) {
      return res
        .status(400)
        .send({ message: "Answer cannot be whitespace only" });
    }

    // Validate email format
    const emailValidation = isValidEmail(emailLower);
    if (!emailValidation.valid) {
      return res.status(400).send({ message: emailValidation.error });
    }

    // Validate phone number format
    const phoneValidation = isValidPhone(phone);
    if (!phoneValidation.valid) {
      return res.status(400).send({ message: phoneValidation.error });
    }

    // Check for XSS attempts
    if (
      containsXSS(name) ||
      containsXSS(email) ||
      containsXSS(password) ||
      containsXSS(address) ||
      containsXSS(DOB) ||
      containsXSS(answer)
    ) {
      return res.status(400).send({ message: "Invalid characters detected" });
    }

    // Check for SQL injection attempts
    if (
      containsSQLInjection(name) ||
      containsSQLInjection(email) ||
      containsSQLInjection(password) ||
      containsSQLInjection(address) ||
      containsSQLInjection(DOB) ||
      containsSQLInjection(answer)
    ) {
      return res.status(400).send({ message: "Invalid characters detected" });
    }

    // Validate DOB
    const dobValidation = isValidDOB(DOB);
    if (!dobValidation.valid) {
      return res.status(400).send({ message: dobValidation.error });
    }

    // Check for excessive length
    if (!isValidLength(name, 100)) {
      return res
        .status(400)
        .send({ message: "Name is too long (max 100 characters)" });
    }
    if (!isValidLength(address, 500)) {
      return res
        .status(400)
        .send({ message: "Address is too long (max 500 characters)" });
    }
    //check user
    const exisitingUser = await userModel.findOne({ email: emailLower });
    //exisiting user
    if (exisitingUser) {
      return res.status(200).send({
        success: false,
        message: "Already Register please login",
      });
    }
    //register user
    const hashedPassword = await hashPassword(password);
    //save
    const user = await new userModel({
      name,
      email: emailLower,
      phone,
      address,
      password: hashedPassword,
      DOB,
      answer,
    }).save();

    res.status(201).send({
      success: true,
      message: "User Register Successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Errro in Registeration",
      error,
    });
  }
};

//POST LOGIN
export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    //validation
    if (!email || !password) {
      return res.status(404).send({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!isNotWhitespaceOnly(email) || !isNotWhitespaceOnly(password)) {
      return res.status(400).send({
        success: false,
        message: "Email and password cannot be whitespace only",
      });
    }

    const emailLower = email.trim().toLowerCase();
    const emailValidation = isValidEmail(emailLower);
    if (!emailValidation.valid) {
      return res.status(400).send({
        success: false,
        message: emailValidation.error,
      });
    }

    //check user
    const user = await userModel.findOne({ email: emailLower });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Email is not registerd",
      });
    }
    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.status(200).send({
        success: false,
        message: "Invalid Password",
      });
    }
    //token
    const token = await JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(200).send({
      success: true,
      message: "login successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        DOB: user.DOB,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in login",
      error,
    });
  }
};

//forgotPasswordController
export const forgotPasswordController = async (req, res) => {
  try {
    const { email, answer, newPassword } = req.body;
    if (!email) {
      return res.status(404).send({ message: "Email is required" });
    }
    if (!answer) {
      return res.status(404).send({ message: "Answer is required" });
    }
    if (!newPassword) {
      return res.status(404).send({ message: "New Password is required" });
    }

    const emailLower = email.trim().toLowerCase();

    if (!isNotWhitespaceOnly(email)) {
      return res.status(400).send({
        message: "Email cannot be whitespace only",
      });
    }
    if (!isNotWhitespaceOnly(answer)) {
      return res.status(400).send({
        message: "Answer cannot be whitespace only",
      });
    }
    if (!isNotWhitespaceOnly(newPassword)) {
      return res.status(400).send({
        message: "New Password cannot be whitespace only",
      });
    }

    // Check for XSS attempts
    if (containsXSS(email) || containsXSS(answer) || containsXSS(newPassword)) {
      return res.status(400).send({ message: "Invalid characters detected" });
    }

    // Check for SQL injection attempts
    if (
      containsSQLInjection(email) ||
      containsSQLInjection(answer) ||
      containsSQLInjection(newPassword)
    ) {
      return res.status(400).send({ message: "Invalid characters detected" });
    }

    // Validate email format
    const emailValidation = isValidEmail(emailLower);
    if (!emailValidation.valid) {
      return res.status(400).send({ message: emailValidation.error });
    }

    //check
    const answerNormalized = answer.trim().toLowerCase();
    const user = await userModel.findOne({ email: emailLower });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Wrong Email Or Answer",
      });
    }
    const storedAnswerNormalized =
      (user.answer && String(user.answer).trim().toLowerCase()) || "";
    if (storedAnswerNormalized !== answerNormalized) {
      return res.status(404).send({
        success: false,
        message: "Wrong Email Or Answer",
      });
    }
    const hashed = await hashPassword(newPassword);
    await userModel.findByIdAndUpdate(user._id, { password: hashed });
    res.status(200).send({
      success: true,
      message: "Password Reset Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

//test controller
export const testController = (req, res) => {
  try {
    res.send("Protected Routes");
  } catch (error) {
    console.log(error);
    res.send({ error });
  }
};

//update prfole
export const updateProfileController = async (req, res) => {
  try {
    const { name, email, password, address, phone } = req.body;
    const user = await userModel.findById(req.user._id);
    //password
    if (password && password.length < 6) {
      return res.json({ error: "Passsword is required and 6 character long" });
    }
    const hashedPassword = password ? await hashPassword(password) : undefined;
    const updatedUser = await userModel.findByIdAndUpdate(
      req.user._id,
      {
        name: name || user.name,
        password: hashedPassword || user.password,
        phone: phone || user.phone,
        address: address || user.address,
      },
      { new: true },
    );
    res.status(200).send({
      success: true,
      message: "Profile Updated SUccessfully",
      updatedUser,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error WHile Update profile",
      error,
    });
  }
};

//orders
export const getOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ buyer: req.user._id })
      .populate("products", "-photo")
      .populate("buyer", "name");
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error WHile Geting Orders",
      error,
    });
  }
};
//orders
export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({})
      .populate("products", "-photo")
      .populate("buyer", "name")
      .sort({ createdAt: "-1" });
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error WHile Geting Orders",
      error,
    });
  }
};

//order status
export const orderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const orders = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true },
    );
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error While Updateing Order",
      error,
    });
  }
};
