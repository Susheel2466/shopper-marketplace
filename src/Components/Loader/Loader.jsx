import React from "react";
import "./Loader.css";

const Loader = ({ message = "Loading..." }) => {
  return (
    <div className="loader">
      <div className="loader-spinner" />
      <p>{message}</p>
    </div>
  );
};

export default Loader;
