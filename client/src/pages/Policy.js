import React from "react";
import Layout from "./../components/Layout";

const Policy = () => {
  return (
    <Layout title={"Privacy Policy"}>
      <div className="row contactus ">
        <div className="col-md-6 ">
          <img
            src="/images/contactus.jpeg"
            alt="contactus"
            style={{ width: "100%" }}
          />
        </div>
        <div className="col-md-4">
          <h4>Privacy Policy</h4>
          <p>
            We value your privacy and are committed to protecting your personal
            information. This policy outlines how we collect, use, and safeguard
            your data when you use our platform.
          </p>
          <p>
            <strong>Information We Collect:</strong> We collect personal details
            such as your name, email address, shipping address, and payment
            information when you create an account or place an order. We may also
            collect browsing data and device information to improve your
            experience.
          </p>
          <p>
            <strong>How We Use Your Information:</strong> Your information is
            used to process orders, manage your account, provide customer
            support, and send promotional communications (with your consent). We
            do not sell or rent your personal data to third parties.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Policy;