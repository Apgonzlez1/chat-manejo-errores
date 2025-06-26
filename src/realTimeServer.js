const { Server } = require("socket.io");

module.exports = (httpServer) => {
  const io = new Server(httpServer);
  const connectedUsers = new Set();

  io.on("connection", (socket) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";
      const username = getUsernameFromCookie(cookieHeader);

      if (!username) {
        console.warn("⚠️ Usuario no identificado, conexión rechazada.");
        socket.disconnect(); // Fuerza la desconexión
        return;
      }

      // Agregar usuario a la lista
      connectedUsers.add(username);
      console.log(`✅ ${username} se ha conectado`);

      // Notificar a otros usuarios
      socket.broadcast.emit("user-connected", username);

      // Enviar lista actualizada de usuarios conectados
      io.emit("update-user-list", Array.from(connectedUsers));

      // Manejo de recepción de mensajes con validación
      socket.on("message", (message) => {
        try {
          if (!message || typeof message !== "string" || !message.trim()) {
            throw new Error("El mensaje no puede estar vacío.");
          }

          // Emitir mensaje a todos
          io.emit("message", {
            user: username,
            message: message.trim(),
          });
        } catch (error) {
          console.error(`❌ Error en mensaje de ${username}:`, error.message);
          socket.emit("error", `Error en el mensaje: ${error.message}`);
        }
      });

      // Manejar desconexión del usuario
      socket.on("disconnect", () => {
        connectedUsers.delete(username);
        console.log(`❌ ${username} se ha desconectado`);

        socket.broadcast.emit("user-disconnected", username);
        io.emit("update-user-list", Array.from(connectedUsers));
      });

    } catch (err) {
      console.error("❌ Error durante la conexión:", err.message);
      socket.emit("error", "Error en la conexión.");
    }
  });

  // 🔧 Función auxiliar para extraer username desde las cookies
  function getUsernameFromCookie(cookieString) {
    const cookies = cookieString.split(";").map(c => c.trim());
    const usernameCookie = cookies.find(c => c.startsWith("username="));
    return usernameCookie ? decodeURIComponent(usernameCookie.split("=")[1]) : null;
  }
};
