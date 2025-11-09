import express from "express";
import { NodeSSH } from "node-ssh";
import dotenv from "dotenv";
import moment from "moment";
import bodyParser from "body-parser";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();
const ssh = new NodeSSH();

app.use(cors());
app.use(bodyParser.json());

// Conectar por SSH al iniciar
(async () => {
  try {
    await ssh.connect({
      host: process.env.SSH_HOST,
      username: process.env.SSH_USER,
      privateKey: process.env.SSH_KEY
    });
    console.log("✅ Conectado al servidor SSH");
  } catch (err) {
    console.error("❌ Error al conectar por SSH:", err.message);
  }
})();

// ✅ Crear usuario SSH con expiración
app.post("/create", async (req, res) => {
  const { username, password, days } = req.body;
  const expireDate = moment().add(days || 1, "days").format("YYYY-MM-DD");

  try {
    const commands = [
      `sudo useradd -m -e ${expireDate} ${username}`,
      `echo "${username}:${password}" | sudo chpasswd`
    ];

    for (const cmd of commands) {
      await ssh.execCommand(cmd);
    }

    res.json({
      success: true,
      username,
      password,
      expires: expireDate
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ❌ Eliminar usuario
app.post("/delete", async (req, res) => {
  const { username } = req.body;
  try {
    await ssh.execCommand(`sudo userdel -r ${username}`);
    res.json({ success: true, username });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📋 Listar usuarios activos
app.get("/users", async (req, res) => {
  try {
    const { stdout } = await ssh.execCommand("cut -d: -f1 /etc/passwd");
    const users = stdout.split("\n").filter(u => u);
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🚀 Iniciar servidor HTTP
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🟢 Servidor corriendo en puerto ${PORT}`));