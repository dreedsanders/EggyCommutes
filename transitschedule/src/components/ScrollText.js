import React from "react";
import "./ScrollText.css";

/**
 * ScrollText Component
 *
 * Handles the scrolling animation for stop names to mimic a bus display sign.
 * The text scrolls horizontally when it overflows the container width.
 *
 * @param {string} text - The stop name text to scroll
 * @param {string} textColor - The color of the scrolling text
 */
const ScrollText = ({ text, textColor }) => {
  // Always enable scrolling for bus-style display effect
  const needsScroll = text && text.length > 0;

  // Duplicate text multiple times for seamless wrapping effect
  const wrappedText = needsScroll ? `${text} • ${text} • ${text} • ` : text;

  return (
    <div className="scroll-text-container">
      <div
        className={`scroll-text ${needsScroll ? "scrolling" : ""}`}
        style={{ color: textColor }}
      >
        {wrappedText}
      </div>
    </div>
  );
};

export default ScrollText;

