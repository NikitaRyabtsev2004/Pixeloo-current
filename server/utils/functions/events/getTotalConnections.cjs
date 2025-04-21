function getTotalConnections(onlineUsers) {
    if (!onlineUsers) return 0;
    return Object.values(onlineUsers).reduce(
      (total, connections) => total + (connections?.length || 0),
      0
    );
  }
  
  module.exports = { getTotalConnections };