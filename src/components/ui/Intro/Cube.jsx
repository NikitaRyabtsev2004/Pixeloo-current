import React, { Component } from 'react';

class CubeRotation extends Component {
  constructor(props) {
    super(props);

    this.state = {
      array: Array(props.gridSize)
        .fill(null)
        .map(() => Array(props.gridSize).fill(null)),
      cubeRotation: { x: 0, y: 0, z: 0 },
    };

    this.animationFrameId = null;
  }

  componentDidMount() {
    this.animationFrameId = requestAnimationFrame(this.rotateCube);
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.animationFrameId);
  }

  cubeVertices = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ];

  edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];

  rotateX(point, angle) {
    const [x, y, z] = point;
    const rad = (Math.PI / 180) * angle;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return [x, y * cos - z * sin, y * sin + z * cos];
  }

  rotateY(point, angle) {
    const [x, y, z] = point;
    const rad = (Math.PI / 180) * angle;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return [x * cos + z * sin, y, -x * sin + z * cos];
  }

  rotateZ(point, angle) {
    const [x, y, z] = point;
    const rad = (Math.PI / 180) * angle;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return [x * cos - y * sin, x * sin + y * cos, z];
  }

  project(point) {
    const distance = 5;
    const [x, y, z] = point;
    const factor = distance / (distance - z);
    const projectedX = x * factor;
    const projectedY = y * factor;
    return [projectedX, projectedY];
  }

  interpolate(x0, y0, x1, y1) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      points.push([x0, y0]);
      points.push([x0 + 1, y0]);
      points.push([x0, y0 + 1]);

      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
    return points;
  }

  rotateCube = () => {
    const { speedX = 0, speedY = 0, speedZ = 0 } = this.props; // Используем props напрямую
    const newRotation = {
      x: (this.state.cubeRotation.x + speedX) % 360,
      y: (this.state.cubeRotation.y + speedY) % 360,
      z: (this.state.cubeRotation.z + speedZ) % 360,
    };

    const updatedArray = this.updateCubeArray(newRotation);

    this.setState({ array: updatedArray, cubeRotation: newRotation });

    this.animationFrameId = requestAnimationFrame(this.rotateCube);
  };

  updateCubeArray = (rotation) => {
    const { gridSize, cubeSize, cubePosition, cubeColor } = this.props;
    const half = Math.floor(gridSize / 2);
    const array = Array(gridSize)
      .fill(0)
      .map(() => Array(gridSize).fill(null));

    const rotatedVertices = this.cubeVertices.map((vertex) => {
      let rotated = this.rotateX(vertex, rotation.x);
      rotated = this.rotateY(rotated, rotation.y);
      rotated = this.rotateZ(rotated, rotation.z);
      return this.project(rotated);
    });

    this.edges.forEach(([startIdx, endIdx]) => {
      const [x0, y0] = rotatedVertices[startIdx];
      const [x1, y1] = rotatedVertices[endIdx];
      const linePoints = this.interpolate(
        Math.floor(half + cubePosition.x + x0 * cubeSize),
        Math.floor(half + cubePosition.y - y0 * cubeSize),
        Math.floor(half + cubePosition.x + x1 * cubeSize),
        Math.floor(half + cubePosition.y - y1 * cubeSize)
      );
      linePoints.forEach(([x, y]) => {
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
          array[y][x] = cubeColor;
        }
      });
    });

    return array;
  };

  getBackgroundColor(value) {
    return {
      backgroundColor: value === null ? 'transparent' : value,
      padding: '1px',
      margin: '0px',
      height: `${this.props.edgeWidth}px`,
      width: `${this.props.edgeWidth}px`,
    };
  }

  render() {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {this.state.array.map((row, rowIndex) => (
          <div key={rowIndex} style={{ display: 'flex', flexDirection: 'row' }}>
            {row.map((value, colIndex) => (
              <span
                key={colIndex}
                className="row-item"
                style={this.getBackgroundColor(value)}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
}

export default CubeRotation;