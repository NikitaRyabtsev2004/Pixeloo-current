import React, { useState, useEffect } from "react";

function RandomNumbers() {
  const [numbers, setNumbers] = useState([]);
  const letters = "PIXELOO";

  const getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const getRandomTransformTime = () => Math.floor(Math.random() * 4000) + 1000;

  // generator
  useEffect(() => {
    const interval = setInterval(() => {
      const newNumbers = Array.from({ length: 10 }, () => {
        const randomLetter = letters[Math.floor(Math.random() * letters.length)];
        return {
          id: Math.random().toString(36).substr(2, 9),
          number: randomLetter,
          x: Math.random() * 100 + "vw",
          y: Math.random() * 100 + "vh",
          color: getRandomColor(),
          transformTime: getRandomTransformTime(),
          isTransformed: false,
        };
      });
      setNumbers((prevNumbers) => [...prevNumbers, ...newNumbers]);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      setNumbers([]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        overflow: "hidden",
        position: "relative",
        width: "100vw",
        height: "100vh",
      }}
      className="number__overlay"
    >
      {numbers.map((item) => (
        <span
          key={item.id}
          className="random__number"
          style={{
            position: "absolute",
            top: item.y,
            left: item.x,
            color: item.color,
            backgroundColor: item.isTransformed ? item.color : "transparent",
            width: "60px",
            height: "60px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: item.isTransformed ? "0" : "60px",
            transition: "all 0.5s ease",
            fontFamily: "'Pixelify Sans', sans-serif, monospace",
            borderRadius: "0",
            overflow: "hidden",
          }}
        >
          {!item.isTransformed && item.number}
        </span>
      ))}
    </div>
  );
}

export default RandomNumbers;