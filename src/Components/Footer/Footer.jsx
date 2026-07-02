import React from "react";
import { useNavigate } from "react-router-dom";
import "./Footer.css";
import footer_logo from "../Assets/logo_big.png";
import instagram_icon from "../Assets/instagram_icon.png";
import pintester_icon from "../Assets/pintester_icon.png";
import whatsapp_icon from "../Assets/whatsapp_icon.png";

const Footer = () => {
  const navigate = useNavigate();

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // No dedicated pages for these yet, so "Products" jumps to the catalog and
  // the rest scroll back to the top of the current page.
  const footerLinks = [
    { label: "Company", onClick: scrollTop },
    { label: "Products", onClick: () => navigate("/womens") },
    { label: "Offices", onClick: scrollTop },
    { label: "About", onClick: scrollTop },
    { label: "Contact", onClick: scrollTop },
  ];

  return (
    <div className="footer">
      <div className="footer-logo">
        <img src={footer_logo} alt="Shopper logo" />
        <p>SHOPPER</p>
      </div>
      <ul className="footer-links">
        {footerLinks.map((link) => (
          <li key={link.label}>
            <button type="button" onClick={link.onClick}>
              {link.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="footer-social-icon">
        <a
          className="footer-icons-container"
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={instagram_icon} alt="Instagram" />
        </a>
        <a
          className="footer-icons-container"
          href="https://pinterest.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={pintester_icon} alt="Pinterest" />
        </a>
        <a
          className="footer-icons-container"
          href="https://whatsapp.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={whatsapp_icon} alt="WhatsApp" />
        </a>
      </div>
      <div className="footer-copyright">
        <hr />
        <p>Copyright @ 2024 - All Rights Reserved.</p>
      </div>
    </div>
  );
};

export default Footer;
