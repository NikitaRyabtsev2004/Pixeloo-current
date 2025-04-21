import React, { useEffect, useState } from 'react';
import CubeRotation from './Cube.jsx';

function Circle() {
  const [x, setX] = useState(6);
  const [y, setY] = useState(2);
  const [z, setZ] = useState(4);
  const [cX, setCX] = useState(0);
  const [cY, setCY] = useState(0);

  // useEffect(() => {
  //   const int1 = setInterval(() => {
  //     setX(5);
  //   }, 700);
  //   return () => clearInterval();
  // });


  return (
    <>
      <div className="Circle" key="circle">
        <CubeRotation
          className="cube"
          speedX={x}
          speedY={y}
          speedZ={z}
          gridSize={50}
          cubeSize={10}
          edgeWidth={1}
          cubeColor="white"
          cubePosition={{ x: cX, y: cY }}
        />
      </div>
    </>
  );
}

export default Circle;
