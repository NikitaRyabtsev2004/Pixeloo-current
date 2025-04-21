// import { useEffect, useState } from 'react';

// export const useCompleteAchievements = ({ socket }) => {
//   const [firstAchive, setFirstAchive] = useState(false);
//   const [secondAchive, setSecondAchive] = useState(false);
//   const [thirdAchive, setThirdAchive] = useState(false);
//   const [fourthAchive, setFourthAchive] = useState(false);
//   const [fifthAchive, setFifthAchive] = useState(false);

//   useEffect(() => {
//     if (!socket) return;

//     socket.emit('get-achievements-complete-user-data');

//     // Handlers to update state when server sends data
//     const updateCompleteFirstAchive = (data) => {
//         setFirstAchive(data);
//       };
//       const updateCompleteSeconsdAchive = (data) => {
//         setSecondAchive(data);
//       };
//       const updateCompleteThirdAchive = (data) => {
//         setThirdAchive(data);
//       };
//       const updateCompleteFourthAchive = (data) => {
//         setFourthAchive(data);
//       };
//       const updateCompleteFifthAchive = (data) => {
//         setFifthAchive(data);
//       };

//     // Subscribe to socket events
//     socket.on('firstAchive-user-data', updateCompleteFirstAchive);
//     socket.on('seconsdAchive-user-data', updateCompleteSeconsdAchive);
//     socket.on('thirdAchive-user-data', updateCompleteThirdAchive);
//     socket.on('fourthAchive-user-data', updateCompleteFourthAchive);
//     socket.on('fifthAchive-user-data', updateCompleteFifthAchive);

//     // Cleanup on unmount
//     return () => {
//       socket.off('firstAchive-user-data', updateCompleteFirstAchive);
//       socket.off('seconsdAchive-user-data', updateCompleteSeconsdAchive);
//       socket.off('thirdAchive-user-data', updateCompleteThirdAchive);
//       socket.off('fourthAchive-user-data', updateCompleteFourthAchive);
//       socket.off('fifthAchive-user-data', updateCompleteFifthAchive);
//     };
//   }, [socket]);

//   return [firstAchive, secondAchive, thirdAchive, fourthAchive, fifthAchive];
// };